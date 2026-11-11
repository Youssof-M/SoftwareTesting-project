export function buildStaffSchedule({ activities, routines, history, staffId, date }) {
  const completedRoutineIds = new Set(
    history.filter((entry) => entry.date === date && entry.routineId).map((entry) => entry.routineId),
  );
  const assignedActivities = activities
    .filter((activity) => activity.date === date && (!staffId || activity.staffId === staffId))
    .map((activity) => ({ ...activity, workType: activity.type, kind: 'activity' }));
  const assignedRoutines = routines
    .filter((routine) => routine.active !== false
      && (routine.frequency === 'Daily' || !routine.frequency)
      && (!staffId || routine.staffId === staffId)
      && !completedRoutineIds.has(routine._id))
    .map((routine) => ({ ...routine, workType: `${routine.type} · daily`, kind: 'routine' }));
  return [...assignedActivities, ...assignedRoutines].sort((a, b) => a.time.localeCompare(b.time));
}
