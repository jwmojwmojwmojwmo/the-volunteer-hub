"use client";

import { useEffect, useRef, useState } from "react";
import { createOrganizationEvent } from "@/app/org/actions";
import { SELF_DECLARED_STAMPS, STAMP_LABELS, VERIFIED_STAMPS } from "@/lib/stamps";
import TagSelector from "./TagSelector";
import { generateEventWithAI, geocodeAddress, reverseGeocodeCoordinates, searchAddressSuggestions } from "./ai-actions";

type EventFormProps = {
  existingTags: string[];
};

type AddressSuggestion = {
  displayName: string;
  lat: string;
  lng: string;
};

export default function EventForm({ existingTags }: EventFormProps) {
  const stampValues = [...SELF_DECLARED_STAMPS, ...VERIFIED_STAMPS];

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const addressSuggestionCache = useRef<Map<string, AddressSuggestion[]>>(new Map());

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    hours: "",
    compensation: "",
    maxVolunteers: "",
    lat: "",
    lng: ""
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const stateKey = name.replace("event", "").replace("volunteerHours", "hours")
                         .replace("compensationOptions", "compensation")
                         .replace("locationLatitude", "lat")
                         .replace("locationLongitude", "lng");

    setFormData(prev => ({ ...prev, [stateKey.charAt(0).toLowerCase() + stateKey.slice(1)]: value }));
  };

  useEffect(() => {
    const query = formData.address.trim();

    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsAddressSearching(false);
      return;
    }

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      setIsAddressSearching(true);
      try {
        const normalizedQuery = query.toLowerCase();
        const cachedSuggestions = addressSuggestionCache.current.get(normalizedQuery);

        if (cachedSuggestions) {
          if (isActive) {
            setAddressSuggestions(cachedSuggestions);
          }
          return;
        }

        const suggestions = await searchAddressSuggestions(query);
        addressSuggestionCache.current.set(normalizedQuery, suggestions);
        if (isActive) {
          setAddressSuggestions(suggestions);
        }
      } catch (error) {
        console.error("Address suggestion lookup failed:", error);
        if (isActive) {
          setAddressSuggestions([]);
        }
      } finally {
        if (isActive) {
          setIsAddressSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [formData.address]);

  const applyAddressSuggestion = (suggestion: AddressSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      address: suggestion.displayName,
      lat: suggestion.lat,
      lng: suggestion.lng
    }));
    setAddressSuggestions([]);
    setGeocodeError(null);
    setLastGeocodedAddress(suggestion.displayName);
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleAiAutoFill = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const generatedData = await generateEventWithAI(aiPrompt, existingTags, stampValues);
      const generatedAddress = generatedData.address?.trim() || "";

      setFormData(prev => ({
        ...prev,
        title: generatedData.title || prev.title,
        description: generatedData.description || prev.description,
        address: generatedAddress || prev.address,
        hours: generatedData.volunteerHours || prev.hours,
        compensation: generatedData.compensationOptions || prev.compensation,
        maxVolunteers: generatedData.maxVolunteers || prev.maxVolunteers,
      }));

      if (generatedAddress) {
        await autoFillCoordinates(generatedAddress, true);
      }

      if (Array.isArray(generatedData.tags)) {
        const cleanTags = generatedData.tags.map((t: string) => t.trim()).filter(Boolean);
        setSelectedTags([...new Set(cleanTags)] as string[]);
      }

      if (Array.isArray(generatedData.requiredSkills)) {
        const validSkills = generatedData.requiredSkills.filter(
          (skill: string): skill is (typeof stampValues)[number] =>
            stampValues.includes(skill as (typeof stampValues)[number])
        );
        setSelectedSkills(validSkills);
      }

    } catch (error) {
      console.error("AI Auto-fill failed:", error);
      setAiError("Failed to generate event details. Try adding more context.");
    } finally {
      setIsGenerating(false);
    }
  };

  const autoFillCoordinates = async (addressToGeocode: string, force = false) => {
    const normalizedAddress = addressToGeocode.trim();

    if (!normalizedAddress || normalizedAddress.length < 5) {
      return;
    }

    if (!force && normalizedAddress.toLowerCase() === lastGeocodedAddress.toLowerCase()) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const geocoded = await geocodeAddress(normalizedAddress);

      if (!geocoded) {
        setGeocodeError("Could not auto-fill coordinates for this address.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        address: geocoded.displayName || prev.address,
        lat: geocoded.lat,
        lng: geocoded.lng
      }));
      setLastGeocodedAddress((geocoded.displayName || normalizedAddress).trim());
    } catch (error) {
      console.error("Address geocoding failed:", error);
      setGeocodeError("Could not auto-fill coordinates for this address.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeocodeError("Your browser does not support location access.");
      return;
    }

    setIsLocatingUser(true);
    setGeocodeError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const lat = position.coords.latitude.toFixed(7);
      const lng = position.coords.longitude.toFixed(7);
      const resolvedAddress = await reverseGeocodeCoordinates(lat, lng);

      setFormData((prev) => ({
        ...prev,
        address: resolvedAddress || prev.address,
        lat,
        lng
      }));

      if (resolvedAddress) {
        setLastGeocodedAddress(resolvedAddress);
      }
      setAddressSuggestions([]);
    } catch (error) {
      console.error("Current location autofill failed:", error);
      setGeocodeError("Could not get your current location. Please allow location access and try again.");
    } finally {
      setIsLocatingUser(false);
    }
  };

  return (
    <>
      <div className="mb-8 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-indigo-900">AI Event Assistant</label>
        <p className="mb-3 text-xs text-indigo-700">
          Roughly describe what you need help with. For example: Need 5 people to help plant trees at Stanley Park this Saturday morning. Free lunch provided. Requires heavy lifting.
        </p>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe your event idea..."
          rows={3}
          className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-3 flex items-center justify-between">
          {aiError ? <span className="text-xs text-red-600">{aiError}</span> : <span />}
          <button
            type="button"
            onClick={handleAiAutoFill}
            disabled={isGenerating || aiPrompt.trim().length < 10}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {isGenerating ? "Drafting Event..." : "Auto-Fill Form"}
          </button>
        </div>
      </div>

      <hr className="mb-8 border-gray-200" />

      <form action={createOrganizationEvent} className="grid gap-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Event Title</label>
          <input
            name="eventTitle"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Stanley Park Tree Planting"
            required
            className="input-shell"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Event Description</label>
          <textarea
            name="eventDescription"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe what volunteers will be doing..."
            rows={5}
            className="input-shell"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Event Address</label>
          <input
            name="eventAddress"
            value={formData.address}
            onChange={handleInputChange}
            onBlur={() => autoFillCoordinates(formData.address)}
            placeholder="e.g., 123 Stanley Park Dr, Vancouver"
            required
            className="input-shell"
          />
          {isAddressSearching ? <p className="mt-1 text-xs text-gray-500">Finding address suggestions...</p> : null}
          {addressSuggestions.length > 0 ? (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {addressSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.displayName}-${suggestion.lat}-${suggestion.lng}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyAddressSuggestion(suggestion);
                  }}
                  className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 last:border-b-0 hover:bg-gray-50"
                >
                  {suggestion.displayName}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">Pick a suggested address to auto-fill exact coordinates.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => autoFillCoordinates(formData.address, true)}
                disabled={isGeocoding || formData.address.trim().length < 5}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeocoding ? "Finding coordinates..." : "Auto-fill coordinates"}
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocatingUser}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLocatingUser ? "Getting location..." : "Use my current location"}
              </button>
            </div>
          </div>
          {geocodeError ? <p className="mt-1 text-xs text-red-600">{geocodeError}</p> : null}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Hours Awarded</label>
            <input
              name="volunteerHours"
              value={formData.hours}
              onChange={handleInputChange}
              type="number"
              step="1"
              placeholder="e.g., 4"
              className="input-shell"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Max Volunteers</label>
            <input
              name="maxVolunteers"
              value={formData.maxVolunteers}
              onChange={handleInputChange}
              type="number"
              step="1"
              placeholder="e.g., 10"
              className="input-shell"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Compensation & Perks</label>
          <input
            name="compensationOptions"
            value={formData.compensation}
            onChange={handleInputChange}
            placeholder="e.g., Free lunch, T-shirt, Transit ticket"
            className="input-shell"
          />
        </div>

        <TagSelector 
          existingTags={existingTags} 
          selectedTags={selectedTags}
          onAddTag={(tag) => {
            if (!selectedTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
              setSelectedTags(prev => [...prev, tag]);
            }
          }}
          onRemoveTag={(tagToRemove) => {
            setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
          }}
        />

        <fieldset className="rounded-md border border-gray-300 p-3">
          <legend className="px-1 text-sm font-medium text-gray-900">Required skills</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {stampValues.map((stamp) => (
              <label key={stamp} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input 
                  name="requiredSkills" 
                  value={stamp} 
                  type="checkbox" 
                  checked={selectedSkills.includes(stamp)}
                  onChange={() => handleSkillToggle(stamp)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span>{STAMP_LABELS[stamp]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Latitude</label>
            <input
              name="locationLatitude"
              value={formData.lat}
              onChange={handleInputChange}
              type="number"
              step="any"
              placeholder="e.g., 49.2827"
              required
              className="input-shell"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Longitude</label>
            <input
              name="locationLongitude"
              value={formData.lng}
              onChange={handleInputChange}
              type="number"
              step="any"
              placeholder="e.g., -123.1207"
              required
              className="input-shell"
            />
          </div>
        </div>

        <button type="submit" className="mt-4 rounded-md bg-black px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800">
          Publish Event
        </button>
      </form>
    </>
  );
}