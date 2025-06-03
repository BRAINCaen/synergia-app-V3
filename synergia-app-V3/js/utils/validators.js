// js/utils/validators.js
// Fonctions de validation pour SYNERGIA v3.0

import { ERROR_MESSAGES } from './constants.js';

/**
 * Classe de base pour les résultats de validation
 */
export class ValidationResult {
    constructor(isValid = true, errors = [], warnings = []) {
        this.isValid = isValid;
        this.errors = Array.isArray(errors) ? errors : [errors];
        this.warnings = Array.isArray(warnings) ? warnings : [warnings];
    }
    
    addError(error) {
        this.errors.push(error);
        this.isValid = false;
        return this;
    }
    
    addWarning(warning) {
        this.warnings.push(warning);
        return this;
    }
    
    merge(other) {
        if (other instanceof ValidationResult) {
            this.errors.push(...other.errors);
            this.warnings.push(...other.warnings);
            this.isValid = this.isValid && other.isValid;
        }
        return this;
    }
    
    getFirstError() {
        return this.errors.length > 0 ? this.errors[0] : null;
    }
    
    getAllErrors() {
        return this.errors;
    }
    
    hasErrors() {
        return this.errors.length > 0;
    }
    
    hasWarnings() {
        return this.warnings.length > 0;
    }
}

/**
 * Validateurs de base
 */
export const BaseValidators = {
    /**
     * Vérifie si une valeur est requise (non vide)
     */
    required(value, fieldName = 'Ce champ') {
        const result = new ValidationResult();
        
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0)) {
            result.addError(`${fieldName} est obligatoire`);
        }
        
        return result;
    },
    
    /**
     * Vérifie la longueur minimale
     */
    minLength(value, min, fieldName = 'Ce champ') {
        const result = new ValidationResult();
        
        if (value && value.length < min) {
            result.addError(`${fieldName} doit faire au moins ${min} caractères`);
        }
        
        return result;
    },
    
    /**
     * Vérifie la longueur maximale
     */
    maxLength(value, max, fieldName = 'Ce champ') {
        const result = new ValidationResult();
        
        if (value && value.length > max) {
            result.addError(`${fieldName} ne peut pas dépasser ${max} caractères`);
        }
        
        return result;
    },
    
    /**
     * Vérifie si la valeur est dans une plage
     */
    range(value, min, max, fieldName = 'Cette valeur') {
        const result = new ValidationResult();
        
        if (value !== null && value !== undefined) {
            const num = Number(value);
            if (!isNaN(num)) {
                if (num < min || num > max) {
                    result.addError(`${fieldName} doit être entre ${min} et ${max}`);
                }
            }
        }
        
        return result;
    },
    
    /**
     * Vérifie si la valeur correspond à une expression régulière
     */
    pattern(value, regex, message = 'Format invalide') {
        const result = new ValidationResult();
        
        if (value && !regex.test(value)) {
            result.addError(message);
        }
        
        return result;
    },
    
    /**
     * Vérifie si la valeur est dans une liste de valeurs autorisées
     */
    oneOf(value, allowedValues, fieldName = 'Cette valeur') {
        const result = new ValidationResult();
        
        if (value && !allowedValues.includes(value)) {
            result.addError(`${fieldName} doit être l'une des valeurs suivantes: ${allowedValues.join(', ')}`);
        }
        
        return result;
    }
};

/**
 * Validateurs spécialisés
 */
export const EmailValidator = {
    validate(email) {
        const result = new ValidationResult();
        
        if (!email) {
            return result.addError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            result.addError(ERROR_MESSAGES.VALIDATION.INVALID_EMAIL);
        }
        
        // Vérifications supplémentaires
        if (email.length > 254) {
            result.addError('L\'email est trop long');
        }
        
        const localPart = email.split('@')[0];
        if (localPart && localPart.length > 64) {
            result.addError('La partie locale de l\'email est trop longue');
        }
        
        return result;
    },
    
    validateDomain(email, allowedDomains = []) {
        const result = new ValidationResult();
        
        if (allowedDomains.length > 0) {
            const domain = email.split('@')[1];
            if (!allowedDomains.includes(domain)) {
                result.addError(`Seuls les domaines suivants sont autorisés: ${allowedDomains.join(', ')}`);
            }
        }
        
        return result;
    }
};

export const PasswordValidator = {
    validate(password, options = {}) {
        const result = new ValidationResult();
        
        const defaults = {
            minLength: 6,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSymbols: false,
            forbidCommon: true
        };
        
        const config = { ...defaults, ...options };
        
        if (!password) {
            return result.addError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
        }
        
        if (password.length < config.minLength) {
            result.addError(`Le mot de passe doit faire au moins ${config.minLength} caractères`);
        }
        
        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            result.addError('Le mot de passe doit contenir au moins une majuscule');
        }
        
        if (config.requireLowercase && !/[a-z]/.test(password)) {
            result.addError('Le mot de passe doit contenir au moins une minuscule');
        }
        
        if (config.requireNumbers && !/\d/.test(password)) {
            result.addError('Le mot de passe doit contenir au moins un chiffre');
        }
        
        if (config.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            result.addError('Le mot de passe doit contenir au moins un symbole');
        }
        
        if (config.forbidCommon && this.isCommonPassword(password)) {
            result.addWarning('Ce mot de passe est trop commun');
        }
        
        return result;
    },
    
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            '1234567890', 'dragon', 'master', 'sunshine', 'princess'
        ];
        
        return commonPasswords.includes(password.toLowerCase());
    },
    
    getStrength(password) {
        let score = 0;
        let feedback = [];
        
        if (password.length >= 8) score += 1;
        else feedback.push('Utilisez au moins 8 caractères');
        
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Ajoutez des minuscules');
        
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Ajoutez des majuscules');
        
        if (/\d/.test(password)) score += 1;
        else feedback.push('Ajoutez des chiffres');
        
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
        else feedback.push('Ajoutez des symboles');
        
        const strength = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][score];
        
        return { score, strength, feedback };
    }
};

export const PhoneValidator = {
    validate(phone, country = 'FR') {
        const result = new ValidationResult();
        
        if (!phone) {
            return result.addError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
        }
        
        // Nettoyer le numéro
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        
        let isValid = false;
        
        switch (country) {
            case 'FR':
                // Format français: 0123456789 ou +33123456789
                isValid = /^(?:\+33|0)[1-9](?:[0-9]{8})$/.test(cleaned);
                break;
            case 'US':
                // Format US: +1234567890
                isValid = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleaned);
                break;
            default:
                // Format international basique
                isValid = /^\+?[1-9]\d{1,14}$/.test(cleaned);
        }
        
        if (!isValid) {
            result.addError(ERROR_MESSAGES.VALIDATION.INVALID_PHONE);
        }
        
        return result;
    },
    
    format(phone, country = 'FR') {
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        
        switch (country) {
            case 'FR':
                if (cleaned.startsWith('+33')) {
                    const number = '0' + cleaned.slice(3);
                    return number.replace(/(\d{2})(?=\d)/g, '$1 ');
                } else if (cleaned.startsWith('0')) {
                    return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ');
                }
                break;
            case 'US':
                const match = cleaned.match(/^(\+?1)?(\d{3})(\d{3})(\d{4})$/);
                if (match) {
                    return `${match[1] || '+1'} (${match[2]}) ${match[3]}-${match[4]}`;
                }
                break;
        }
        
        return phone;
    }
};

export const DateValidator = {
    validate(date, options = {}) {
        const result = new ValidationResult();
        
        const config = {
            allowPast: true,
            allowFuture: true,
            minDate: null,
            maxDate: null,
            ...options
        };
        
        if (!date) {
            return result.addError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
        }
        
        const dateObj = new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return result.addError(ERROR_MESSAGES.VALIDATION.INVALID_DATE);
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const inputDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        
        if (!config.allowPast && inputDate < today) {
            result.addError('La date ne peut pas être dans le passé');
        }
        
        if (!config.allowFuture && inputDate > today) {
            result.addError('La date ne peut pas être dans le futur');
        }
        
        if (config.minDate && dateObj < new Date(config.minDate)) {
            result.addError(`La date doit être après le ${new Date(config.minDate).toLocaleDateString('fr-FR')}`);
        }
        
        if (config.maxDate && dateObj > new Date(config.maxDate)) {
            result.addError(`La date doit être avant le ${new Date(config.maxDate).toLocaleDateString('fr-FR')}`);
        }
        
        return result;
    },
    
    validateRange(startDate, endDate) {
        const result = new ValidationResult();
        
        if (!startDate || !endDate) {
            return result.addError('Les deux dates sont requises');
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return result.addError('Dates invalides');
        }
        
        if (start > end) {
            result.addError('La date de début doit être antérieure à la date de fin');
        }
        
        return result;
    }
};

export const TimeValidator = {
    validate(time, options = {}) {
        const result = new ValidationResult();
        
        if (!time) {
            return result.addError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
        }
        
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/;
        
        if (!timeRegex.test(time)) {
            return result.addError(ERROR_MESSAGES.VALIDATION.INVALID_TIME);
        }
        
        const [hours, minutes] = time.split(':').map(Number);
        
        if (options.minHour !== undefined && hours < options.minHour) {
            result.addError(`L'heure doit être après ${options.minHour}h`);
        }
        
        if (options.maxHour !== undefined && hours > options.maxHour) {
            result.addError(`L'heure doit être avant ${options.maxHour}h`);
        }
        
        return result;
    },
    
    validateRange(startTime, endTime) {
        const result = new ValidationResult();
        
        if (!startTime || !endTime) {
            return result.addError('Les deux heures sont requises');
        }
        
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        if (start === null || end === null) {
            return result.addError('Format d\'heure invalide');
        }
        
        if (start >= end) {
            result.addError('L\'heure de début doit être antérieure à l\'heure de fin');
        }
        
        return result;
    },
    
    timeToMinutes(time) {
        const match = time.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        
        return hours * 60 + minutes;
    }
};

export const FileValidator = {
    validate(file, options = {}) {
        const result = new ValidationResult();
        
        const config = {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: [],
            allowedExtensions: [],
            ...options
        };
        
        if (!file) {
            return result.addError('Fichier requis');
        }
        
        // Vérifier la taille
        if (file.size > config.maxSize) {
            const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
            result.addError(`Le fichier ne peut pas dépasser ${maxSizeMB}MB`);
        }
        
        // Vérifier le type MIME
        if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(file.type)) {
            result.addError(`Type de fichier non autorisé. Types autorisés: ${config.allowedTypes.join(', ')}`);
        }
        
        // Vérifier l'extension
        if (config.allowedExtensions.length > 0) {
            const extension = file.name.split('.').pop().toLowerCase();
            if (!config.allowedExtensions.includes(extension)) {
                result.addError(`Extension non autorisée. Extensions autorisées: ${config.allowedExtensions.join(', ')}`);
            }
        }
        
        return result;
    },
    
    validateImage(file, options = {}) {
        const result = this.validate(file, {
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            ...options
        });
        
        return result;
    },
    
    validateDocument(file, options = {}) {
        const result = this.validate(file, {
            allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            allowedExtensions: ['pdf', 'doc', 'docx'],
            ...options
        });
        
        return result;
    }
};

/**
 * Validateurs métier spécifiques à SYNERGIA
 */
export const SynergiaValidators = {
    validateUser(userData) {
        const result = new ValidationResult();
        
        // Nom d'affichage
        result.merge(BaseValidators.required(userData.displayName, 'Le nom'));
        result.merge(BaseValidators.minLength(userData.displayName, 2, 'Le nom'));
        result.merge(BaseValidators.maxLength(userData.displayName, 50, 'Le nom'));
        
        // Email
        result.merge(EmailValidator.validate(userData.email));
        
        // Rôle
        const validRoles = ['admin', 'manager', 'employee', 'intern', 'entretien', 'accueil', 'animation', 'securite'];
        result.merge(BaseValidators.oneOf(userData.role, validRoles, 'Le rôle'));
        
        return result;
    },
    
    validateQuest(questData) {
        const result = new ValidationResult();
        
        // Titre
        result.merge(BaseValidators.required(questData.title, 'Le titre'));
        result.merge(BaseValidators.minLength(questData.title, 3, 'Le titre'));
        result.merge(BaseValidators.maxLength(questData.title, 100, 'Le titre'));
        
        // Type
        const validTypes = ['daily', 'weekly', 'special', 'monthly', 'training'];
        result.merge(BaseValidators.oneOf(questData.type, validTypes, 'Le type'));
        
        // XP
        if (questData.xp !== undefined) {
            result.merge(BaseValidators.range(questData.xp, 1, 1000, 'L\'XP'));
        }
        
        // Priorité
        if (questData.priority) {
            const validPriorities = ['low', 'normal', 'high', 'urgent', 'critical'];
            result.merge(BaseValidators.oneOf(questData.priority, validPriorities, 'La priorité'));
        }
        
        // Description
        if (questData.description) {
            result.merge(BaseValidators.maxLength(questData.description, 500, 'La description'));
        }
        
        return result;
    },
    
    validateShift(shiftData) {
        const result = new ValidationResult();
        
        // Date
        result.merge(DateValidator.validate(shiftData.date, { allowPast: false }));
        
        // Heures
        result.merge(TimeValidator.validate(shiftData.startTime));
        result.merge(TimeValidator.validate(shiftData.endTime));
        result.merge(TimeValidator.validateRange(shiftData.startTime, shiftData.endTime));
        
        // Assignation
        result.merge(BaseValidators.required(shiftData.assignedTo, 'L\'assignation'));
        
        // Titre (optionnel)
        if (shiftData.title) {
            result.merge(BaseValidators.maxLength(shiftData.title, 100, 'Le titre'));
        }
        
        // Description (optionnelle)
        if (shiftData.description) {
            result.merge(BaseValidators.maxLength(shiftData.description, 300, 'La description'));
        }
        
        return result;
    },
    
    validateEvent(eventData) {
        const result = new ValidationResult();
        
        // Titre
        result.merge(BaseValidators.required(eventData.title, 'Le titre'));
        result.merge(BaseValidators.minLength(eventData.title, 3, 'Le titre'));
        result.merge(BaseValidators.maxLength(eventData.title, 100, 'Le titre'));
        
        // Date de début
        result.merge(DateValidator.validate(eventData.startDate));
        
        // Date de fin (si fournie)
        if (eventData.endDate) {
            result.merge(DateValidator.validate(eventData.endDate));
            result.merge(DateValidator.validateRange(eventData.startDate, eventData.endDate));
        }
        
        // Heures (si pas toute la journée)
        if (!eventData.allDay) {
            if (eventData.startTime) {
                result.merge(TimeValidator.validate(eventData.startTime));
            }
            if (eventData.endTime) {
                result.merge(TimeValidator.validate(eventData.endTime));
            }
            if (eventData.startTime && eventData.endTime) {
                result.merge(TimeValidator.validateRange(eventData.startTime, eventData.endTime));
            }
        }
        
        // Type
        if (eventData.type) {
            const validTypes = ['general', 'meeting', 'training', 'maintenance', 'event', 'holiday'];
            result.merge(BaseValidators.oneOf(eventData.type, validTypes, 'Le type'));
        }
        
        // Priorité
        if (eventData.priority) {
            const validPriorities = ['normal', 'high', 'urgent'];
            result.merge(BaseValidators.oneOf(eventData.priority, validPriorities, 'La priorité'));
        }
        
        return result;
    },
    
    validateLeaveRequest(leaveData) {
        const result = new ValidationResult();
        
        // Dates
        result.merge(DateValidator.validate(leaveData.startDate, { allowPast: false }));
        result.merge(DateValidator.validate(leaveData.endDate, { allowPast: false }));
        result.merge(DateValidator.validateRange(leaveData.startDate, leaveData.endDate));
        
        // Type
        const validTypes = ['vacation', 'sick', 'personal', 'family', 'maternity', 'paternity', 'other'];
        result.merge(BaseValidators.oneOf(leaveData.type, validTypes, 'Le type de congé'));
        
        // Raison
        result.merge(BaseValidators.required(leaveData.reason, 'La raison'));
        result.merge(BaseValidators.minLength(leaveData.reason, 5, 'La raison'));
        result.merge(BaseValidators.maxLength(leaveData.reason, 300, 'La raison'));
        
        return result;
    },
    
    validateMessage(messageData) {
        const result = new ValidationResult();
        
        // Contenu
        result.merge(BaseValidators.required(messageData.content, 'Le message'));
        result.merge(BaseValidators.minLength(messageData.content, 1, 'Le message'));
        result.merge(BaseValidators.maxLength(messageData.content, 1000, 'Le message'));
        
        // Destinataire ou conversation
        if (!messageData.conversationId && !messageData.recipientId) {
            result.addError('Un destinataire ou une conversation est requis');
        }
        
        // Type
        if (messageData.type) {
            const validTypes = ['text', 'image', 'file', 'system'];
            result.merge(BaseValidators.oneOf(messageData.type, validTypes, 'Le type de message'));
        }
        
        return result;
    }
};

/**
 * Validateur principal qui combine tous les validateurs
 */
export class Validator {
    static validate(data, rules) {
        const result = new ValidationResult();
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = data[field];
            
            for (const rule of fieldRules) {
                if (typeof rule === 'function') {
                    const fieldResult = rule(value, field);
                    result.merge(fieldResult);
                } else if (typeof rule === 'object' && rule.validator) {
                    const fieldResult = rule.validator(value, rule.options, field);
                    result.merge(fieldResult);
                }
            }
        }
        
        return result;
    }
    
    static async validateAsync(data, rules) {
        const result = new ValidationResult();
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = data[field];
            
            for (const rule of fieldRules) {
                let fieldResult;
                
                if (typeof rule === 'function') {
                    fieldResult = await rule(value, field);
                } else if (typeof rule === 'object' && rule.validator) {
                    fieldResult = await rule.validator(value, rule.options, field);
                }
                
                if (fieldResult instanceof ValidationResult) {
                    result.merge(fieldResult);
                }
            }
        }
        
        return result;
    }
}

/**
 * Décorateur pour valider automatiquement les méthodes
 */
export function validate(rules) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;
        
        descriptor.value = function(...args) {
            const [data] = args;
            const validationResult = Validator.validate(data, rules);
            
            if (!validationResult.isValid) {
                throw new Error(validationResult.getFirstError());
            }
            
            return method.apply(this, args);
        };
        
        return descriptor;
    };
}

/**
 * Export de tous les validateurs
 */
export default {
    ValidationResult,
    BaseValidators,
    EmailValidator,
    PasswordValidator,
    PhoneValidator,
    DateValidator,
    TimeValidator,
    FileValidator,
    SynergiaValidators,
    Validator,
    validate
};
