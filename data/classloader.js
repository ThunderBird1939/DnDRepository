export async function loadClass(classId) {
  const res = await fetch(`./data/classes/${classId}.json`);
  if (!res.ok) throw new Error(`Failed to load class: ${classId}`);
  return await res.json();
}

export async function loadSubclasses(classId) {
  const res = await fetch(`./data/subclasses/${classId}/index.json`);
  if (!res.ok) return [];
  return await res.json();
}
