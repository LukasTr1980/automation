import Joi from 'joi';

interface LoginData {
    username: string;
    password: string;
}

const loginValidation = (data: LoginData) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'usernameEmpty',
                'string.alphanum': 'usernameAlphanum',
                'string.min': 'usernameMinLength',
                'string.max': 'usernameMaxLength',
                'any.required': 'usernameRequired'
            }),
        password: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'passwordEmpty',
                'string.alphanum': 'passwordAlphanum',
                'string.min': 'passwordMinLength',
                'string.max': 'passwordMaxLength',
                'any.required': 'passwordRequired'
            }),
    });
    return schema.validate(data);
};

export {
    loginValidation
};
