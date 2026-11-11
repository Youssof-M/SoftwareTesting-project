import { makeService, completeActivity, completeRoutine } from '../services/recordService.js';

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function makeController(kind) {
  const service = makeService(kind);
  return {
    list: asyncHandler(async (_req, res) => res.json(await service.list())),
    create: asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body))),
    update: asyncHandler(async (req, res) => {
      const record = await service.update(req.params.id, req.body);
      if (!record) return res.status(404).json({ message: 'Record not found.' });
      return res.json(record);
    }),
    remove: asyncHandler(async (req, res) => {
      const record = await service.remove(req.params.id);
      if (!record) return res.status(404).json({ message: 'Record not found.' });
      return res.status(204).end();
    }),
  };
}

export const complete = asyncHandler(async (req, res) => {
  return res.json(await completeActivity(req.params.id, req.user));
});

export const completeCareRoutine = asyncHandler(async (req, res) => {
  return res.json(await completeRoutine(req.params.id, req.body?.date, req.user));
});
