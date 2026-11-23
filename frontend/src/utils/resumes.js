// Resume pickers show the newest few and a "Show all" toggle, but the selected
// resume always stays visible even when it is further down the list.
export const PICKER_PREVIEW = 3;

export const visibleResumes = (resumes, selectedId, showAll, max = PICKER_PREVIEW) => {
  if (showAll || resumes.length <= max) return resumes;
  const shown = resumes.slice(0, max);
  const selected = resumes.find((r) => r._id === selectedId);
  return selected && !shown.includes(selected) ? [...shown, selected] : shown;
};
