import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  // 1. Await the Supabase client connection
  const supabase = await createClient(); 

  // 2. Fetch the data, ordering by newest first
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  // 3. Handle errors gracefully
  if (error) {
    console.error('Error fetching tasks:', error);
    return (
      <main className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          <h2 className="font-bold">Failed to load tasks.</h2>
          <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
        </div>
      </main>
    );
  }

  // 4. Render the UI
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Volunteer Opportunities</h1>
        
        <div className="grid gap-4 md:grid-cols-2">
          {tasks?.length === 0 ? (
            <p className="text-gray-500">No tasks found. Add some in Supabase!</p>
          ) : (
            tasks?.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                
                {/* Header: Title and Hours */}
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight pr-4">
                    {task.title}
                  </h2>
                  {task.hours_given && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {task.hours_given} hrs
                    </span>
                  )}
                </div>
                
                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {task.description}
                </p>
                
                <div className="space-y-3">
                  {/* Tags Array Rendered as Badges */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Skills Array Rendered as Badges */}
                  {task.skills_needed && task.skills_needed.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500 font-medium mr-1">Requires:</span>
                      {task.skills_needed.map(skill => (
                        <span key={skill} className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}