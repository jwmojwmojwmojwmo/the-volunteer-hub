"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

type GeocodeResult = {
  lat: string;
  lng: string;
  displayName: string;
};

type AddressSuggestion = {
  displayName: string;
  lat: string;
  lng: string;
};

type NominatimAddressParts = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

function formatHumanReadableAddress(parts?: NominatimAddressParts, fallback?: string) {
  if (!parts) {
    return fallback?.trim() || "";
  }

  const street = [parts.house_number, parts.road].filter(Boolean).join(" ").trim();
  const locality = parts.city || parts.town || parts.village || parts.suburb || parts.neighbourhood;
  const region = parts.state;
  const postal = parts.postcode;
  const country = parts.country;

  const formatted = [street, locality, region, postal, country]
    .map((segment) => segment?.trim())
    .filter((segment): segment is string => Boolean(segment && segment.length > 0))
    .join(", ");

  return formatted || fallback?.trim() || "";
}

export async function generateEventWithAI(promptText: string, existingTags: string[], availableSkills: string[]) {
  if (!promptText || promptText.trim().length < 10) {
    throw new Error("Prompt too short");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an AI assistant for a volunteer matching platform.
    A user has provided a rough idea for an event. Extract and infer the details to fully populate an event creation form.

    User's rough idea: "${promptText}"

    Available System Tags (Prioritize using these, but you can create 1 or 2 new ones if highly relevant): ${JSON.stringify(existingTags)}
    Available Valid Skills (You MUST ONLY select from this exact list, or return an empty array): ${JSON.stringify(availableSkills)}

    Return a valid JSON object with EXACTLY the following keys and data types:
    {
      "title": "string (A catchy, clear title)",
      "description": "string (A polished, detailed description of the event based on the user's idea)",
      "address": "string (The location, if mentioned. Otherwise empty string)",
      "volunteerHours": "string (Number of hours, estimated from description. Default to '0' if unknown)",
      "compensationOptions": "string (Comma separated perks like 'Free lunch, T-shirt'. Empty string if none)",
      "maxVolunteers": "string (Estimated capacity as a number string like '10'. Default to '1' if unknown)",
      "tags": ["string", "string"],
      "requiredSkills": ["string", "string"] // MUST ONLY match the provided Available Valid Skills
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI Event Generation Error:", error);
    throw new Error("Failed to parse AI response");
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmedAddress = address.trim();

  if (!trimmedAddress || trimmedAddress.length < 5) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmedAddress);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "youcode-2026-event-geocoder/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: NominatimAddressParts;
  }>;
  const firstMatch = payload[0];

  if (!firstMatch?.lat || !firstMatch?.lon) {
    return null;
  }

  const formattedAddress = formatHumanReadableAddress(firstMatch.address, firstMatch.display_name || trimmedAddress);

  return {
    lat: firstMatch.lat,
    lng: firstMatch.lon,
    displayName: formattedAddress || firstMatch.display_name || trimmedAddress
  };
}

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery || normalizedQuery.length < 3) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "youcode-2026-event-geocoder/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: NominatimAddressParts;
  }>;

  return payload
    .filter((entry) => Boolean(entry.lat && entry.lon && entry.display_name))
    .map((entry) => ({
      displayName: formatHumanReadableAddress(entry.address, entry.display_name) || (entry.display_name as string),
      lat: entry.lat as string,
      lng: entry.lon as string
    }));
}

export async function reverseGeocodeCoordinates(lat: string, lng: string): Promise<string | null> {
  const normalizedLat = lat.trim();
  const normalizedLng = lng.trim();

  if (!normalizedLat || !normalizedLng) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", normalizedLat);
  url.searchParams.set("lon", normalizedLng);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "youcode-2026-event-geocoder/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    display_name?: string;
    address?: NominatimAddressParts;
  };

  const formatted = formatHumanReadableAddress(payload.address, payload.display_name);
  return formatted || null;
}