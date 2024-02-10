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

const roleCookieValidation = (cookieValue: string) => {
    const schema = Joi.string().required().custom((value, helpers) => {
        const parts = value.split(':');
        if (parts.length !== 2) {
            return helpers.message({ custom: 'Invalid roleCookie format. Must contain one colon separating two hexadecimal strings.' });
        }
        const [iv, encryptedData] = parts;
        if (!/^[0-9a-fA-F]{32}$/.test(iv)) {
            return helpers.message({ custom: 'Invalid roleCookie IV format: must be 32 hex characters.' });
        }
        if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
            return helpers.message({ custom: 'Invalid roleCookie encrypted data format: must be a hex string.' });
        }
        return value;
    }, 'Cookie value format validation').messages({
        'string.empty': 'cookieEmpty',
        'any.required': 'cookieRequired',
        'custom': '{{#label}} does not meet the required format.'
    });
    return schema.validate(cookieValue);
};

const refreshTokenValidation = (refreshToken: string) => {
    const schema = Joi.string().required().length(80).hex().messages({
        'string.empty': 'refreshToken empty',
        'string.length': 'refreshToken invalid length',
        'string.hex': 'refreshToken is not hex',
        'any.required': 'refreshToken is empty'
    });
    return schema.validate(refreshToken);
};

const deviceIdValidation = (deviceId: string) => {
    const schema = Joi.string().uuid({ version: 'uuidv4' }).required().messages({
        'string.empty': 'Device ID is empty',
        'string.uuid': 'Device ID must be a valid UUID v4',
        'any.required': 'Device ID is required'
    });
    return schema.validate(deviceId);
};

const usernameValidation = (username: string) => {
    const schema = Joi.string().alphanum().min(1).max(30).required()
        .messages({
            'string.empty': 'username is empty',
            'string.alphanum': 'username must be alphanumeric',
            'string.min': 'username invalid length',
            'string.max': 'username invalid length',
            'any.required': 'username is required'
        });

    return schema.validate(username);
};

export {
    loginValidation,
    roleCookieValidation,
    refreshTokenValidation,
    deviceIdValidation,
    usernameValidation
};
