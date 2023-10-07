const Joi = require('joi');

const loginValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'Benutzername darf nicht leer sein',
                'string.alphanum': 'Benutzername darf nur alphanumerische Zeichen enthalten',
                'string.min': 'Benutzername muss eine Mindestlänge von 1 haben',
                'string.max': 'Benutzername darf maximal 30 Zeichen lang sein',
                'any.required': 'Benutzername ist ein Pflichtfeld'
            }),
        password: Joi.string().alphanum().min(1).max(30).required()
            .messages({
                'string.empty': 'Passwort darf nicht leer sein',
                'string.alphanum': 'Passwort darf nur alphanumerische Zeichen enthalten',
                'string.min': 'Passwort muss eine Mindestlänge von 1 haben',
                'string.max': 'Passwort darf maximal 30 Zeichen lang sein',
                'any.required': 'Passwort ist ein Pflichtfeld'
            }),
    });
    return schema.validate(data);
};

module.exports = {
    loginValidation
};
