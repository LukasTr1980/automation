const Joi = require('joi');

const loginValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'Username cannot be an empty field',
                'string.alphanum': 'Username must only contain alpha-numeric characters',
                'string.min': 'Username should have a minimum length of 1',
                'string.max': 'Username should have a maximum length of 30',
                'any.required': 'Username is a required field'
            }),
        password: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'Password cannot be an empty field',
                'string.alphanum': 'Password must only contain alpha-numeric characters',
                'string.min': 'Password should have a minimum length of 1',
                'string.max': 'Password should have a maximum length of 30',
                'any.required': 'Password is a required field'
            }),
    });
    return schema.validate(data);
};

module.exports = {
    loginValidation
};
