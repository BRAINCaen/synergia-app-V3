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
            'password123', 'admin', 'let
