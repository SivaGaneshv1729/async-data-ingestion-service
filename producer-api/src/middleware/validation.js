import Joi from 'joi';

export const ingestSchema = Joi.object({
    user_id: Joi.string().required(),
    event_type: Joi.string().required(),
    timestamp: Joi.string().isoDate().optional(),
    details: Joi.object().optional().unknown()
});
