/*
 * Regulate.js
 * http://github.com/eddflrs/regulate.js
 * @author Eddie Flores
 * @license MIT License
 * @version 0.1.3.1
 */

/*jslint indent: 2 */
/*jslint browser: true */
/*jslint devel: true */
/*jslint nomen: true */
/*jslint unparam: true */
/*global _ */
/*global jQuery */

if (this.jQuery === undefined) {
  this.jQuery = {};
}

(function (root, _, $) {
  "use strict";

  var Rules, Messages, Form, Regulate, MessageTranslations, Messages_en;

  /*
   * @private
   * The object containing all validation rules.
   */
  Rules = {

    max_length: function (str, rule) {
      return rule.max_length ? (str.length <= rule.max_length) : false;
    },

    min_length: function (str, rule) {
      return rule.min_length ? (str.length >= rule.min_length) : false;
    },

    exact_length: function (str, rule) {
      return rule.exact_length ? (str.length === rule.exact_length) : false;
    },

    email: function (str) {
      var re = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
      return re.test(str);
    },

    match_field: function (fieldValue, fieldReqs, fields) {
      var targetField, result = false;
      if (fieldReqs.match_field) {
        targetField = fieldReqs.match_field;
        _.each(fields, function (field) {
          if (field.name === targetField) {
            result = field.value === fieldValue;
          }
        });
      }
      return result;
    },

    min_count: function (fieldName, fieldReqs, fields) {
      if (!fieldReqs[fieldName]) {
        return false;
      }

      var items = _.filter(fields, function (field) {
        return field.name === fieldReqs.name;
      });

      return items.length >= fieldReqs[fieldName];
    },

    max_count: function (fieldName, fieldReqs, fields) {
      if (!fieldReqs[fieldName]) {
        return false;
      }

      var items = _.filter(fields, function (field) {
        return field.name === fieldReqs.name;
      });

      return items.length <= fieldReqs[fieldName];
    },

    exact_count: function (fieldName, fieldReqs, fields) {
      if (!fieldReqs[fieldName]) {
        return false;
      }

      var items = _.filter(fields, function (field) {
        return field.name === fieldReqs.name;
      });

      return items.length === fieldReqs[fieldName];
    },

    min_checked: function (fieldValue, fieldReqs, fields) {
      return this.min_count('min_checked', fieldReqs, fields);
    },

    exact_checked: function (fieldValue, fieldReqs, fields) {
      return this.exact_count('exact_checked', fieldReqs, fields);
    },

    max_checked: function (fieldValue, fieldReqs, fields) {
      return this.max_count('max_checked', fieldReqs, fields);
    },

    min_selected: function (fieldValue, fieldReqs, fields) {
      return this.min_count('min_selected', fieldReqs, fields);
    },

    exact_selected: function (fieldValue, fieldReqs, fields) {
      return this.exact_count('exact_selected', fieldReqs, fields);
    },

    max_selected: function (fieldValue, fieldReqs, fields) {
      return this.max_count('max_selected', fieldReqs, fields);
    }
  };

  /*
   * @private
   * The following messages are generated after a failed validation.
   */
  Messages_en = {
    required: function (fieldName, fieldReqs) {
      var lastChar, verb;
      lastChar = fieldName.charAt(fieldName.length - 1);
      verb = (lastChar === 's') ? 'are' : 'is';
      return fieldName + " " + verb + " required.";
    },

    email: function (fieldName, fieldReqs) {
      return fieldName + " must be a valid email.";
    },

    match_field: function (fieldName, fieldReqs, formReqs) {
      var matchName, displayName, matchField;
      matchField = fieldReqs.match_field;
      matchName = formReqs[matchField].display_as || matchField;
      displayName = fieldReqs.display_as || fieldReqs.name;
      return displayName + " must match " + matchName;
    },

    max_length: function (fieldName, fieldReqs) {
      var maxLength = fieldReqs.max_length;
      return fieldName + " must have a maximum length of " + maxLength + ".";
    },

    min_length: function (fieldName, fieldReqs) {
      var minLength = fieldReqs.min_length;
      return fieldName + " must have a minimum length of " + minLength + ".";
    },

    exact_length: function (fieldName, fieldReqs) {
      var exactLength = fieldReqs.exact_length;
      return fieldName + " must have an exact length of " + exactLength + ".";
    },

    min_checked: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.min_checked;
      message = "Check atleast " + reqValue + " checkbox";
      message += (reqValue !== 1) ? "es" : ".";
      return message;
    },

    max_checked: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.max_checked;
      message = "Check a maximum of " + reqValue + " checkbox";
      message += (reqValue !== 1) ? "es" : ".";
      return message;
    },

    exact_checked: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.exact_checked;
      message = "Check exactly " + reqValue + " checkbox";
      message += (reqValue !== 1) ? "es" : ".";
      return message;
    },

    min_selected: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.min_selected;
      message = "Select atleast " + reqValue + " option";
      message += (reqValue !== 1) ? "s" : ".";
      return message;
    },

    max_selected: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.max_selected;
      message = "Select a maximum of " + reqValue + " option";
      message += (reqValue !== 1) ? "s" : ".";
      return message;
    },

    exact_selected: function (fieldName, fieldReqs) {
      var reqValue, message;
      reqValue = fieldReqs.exact_selected;
      message = "Select exactly " + reqValue + " option";
      message += (reqValue !== 1) ? "s" : ".";
      return message;
    }
  };

  MessageTranslations = {
    'en' : Messages_en
  };

  Messages = MessageTranslations.en;

  /*
   * @private
   * @constructor
   * Represents a form with validation requirements.
   */
  Form = function (name, requirements) {
    this.name = name;
    this.cbs = [];
    this.errorElems = {};
    this.isBrowser = false;
    this.reqs = this.transformReqs(requirements);
  };

  /*
   * @private
   * Displays the error messages in the supplied DOM elements.
   */
  Form.prototype.displayErrors = function (errors) {
    var self = this;

    _.each(errors, function (errorMsgs, errorName) {
      var i, ul, errorElem;

      errorElem = self.errorElems[errorName] || '';

      if (errorElem) {
        errorElem = $(errorElem);
        ul = $("<ul></ul>");
        for (i = 0; i < errorMsgs.length; i += 1) {
          $("<li>" + errorMsgs[i] + "</li>").appendTo(ul);
        }
        ul.appendTo(errorElem);
      }
    });
  };

  /*
   * @private
   * Calls all registered callbacks.
   */
  Form.prototype.notifySubmission = function (error, data) {
    _.each(this.cbs, function (cb) {
      cb(error, data);
    });
  };

  /*
   * @public
   * Applies the validation rules on the given array (formFields) and
   * calls back (cb) with `error` and `data` arguments.
   *
   * @param formFields Array - [{name: fieldName, value: fieldValue}]
   * @param cb Function - The callback to be called after validation.
   *    @argument error
   *    @agument data
   */
  Form.prototype.validate = function (formFields, cb) {
    var self = this, errors = {}, transformedFieldValues = {};

    if (!formFields) {
      throw new Error("Field values must be supplied in order to validate.");
    }

    if (cb) {
      self.cbs.push(cb);
    }

    // Restructure the form values so it's easier to check against the rules
    // ie: {fieldName: [fieldVal, ...], ...}
    _.each(formFields, function (formField) {
      var name = formField.name, value = formField.value.trim();
      transformedFieldValues[name] = transformedFieldValues[name] || [];
      if (value) {
        transformedFieldValues[name].push(value);
      }
    });

    // Check form values against the validation requirements.
    _.each(self.reqs, function (fieldReqs, fieldName) {
      var fieldVals, error, displayName, fieldErrors = [];

      // Compensate for any missing form values (checkboxes, multiselects).
      if (!transformedFieldValues[fieldName]) {
        transformedFieldValues[fieldName] = [];
      }

      fieldVals = transformedFieldValues[fieldName];

      if (_.isEmpty(fieldVals)) {
        displayName = fieldReqs.display_as || fieldName;
        error = Messages.required(displayName, fieldReqs, self.reqs);
        fieldErrors.push(error);
      } else {
        _.each(fieldReqs, function (reqVal, reqName) {
          if (reqName !== 'name' && Rules.hasOwnProperty(reqName)) {
            _.each(fieldVals, function (fieldVal) {
              var testResult = Rules[reqName](fieldVal, fieldReqs, formFields);
              if (!testResult) {
                if (Messages[reqName]) {
                  displayName = fieldReqs.display_as || fieldName;
                  error = Messages[reqName](displayName, fieldReqs, self.reqs);
                } else {
                  error = reqName;
                }

                if (_.indexOf(fieldErrors, error) === -1) {
                  fieldErrors.push(error);
                }
              }
            });
          }
        });
      }

      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    });

    if (_.isEmpty(errors)) {
      self.notifySubmission(null, formFields);
    } else {
      if (self.isBrowser) {
        self.displayErrors(errors);
      }
      self.notifySubmission(errors, null);
    }
  };

  /*
   * @private
   * Transforms the user requirements into a data structure that's easier to
   * work with. ie: {fieldName1: [{fieldRequirements}, ...], fieldName2: ...}
   */
  Form.prototype.transformReqs = function (userRequirements) {
    var self = this, transformedReqs = {};

    _.each(userRequirements, function (userReq) {
      var reqName, fieldReq = {}, fieldName = userReq.name;
      for (reqName in userReq) {
        if (userReq.hasOwnProperty(reqName)) {
          if (reqName === 'display_error') {
            self.errorElems[fieldName] = userReq[reqName];
          } else {
            fieldReq[reqName] = userReq[reqName];
          }
        }
      }
      if (userReq.name) {
        transformedReqs[userReq.name] = fieldReq;
      }
    });

    return transformedReqs;
  };

  /*
   * @private
   * Adds a callback to be called after validation.
   * @param cb Function - callback.
   */
  Form.prototype.addCb = function (cb) {
    var self = this;
    self.cbs.push(cb);
  };

  /*
   * @public
   * Registers a callback to be called after form submission and its validation.
   * @param cb Function - The callback to be called with validation results.
   *    @argument error
   *    @agument data
   */
  Form.prototype.onSubmit = function (cb) {
    var self = this;
    self.addCb(cb);
    self.isBrowser = true;

    $('#' + self.name).on('submit', function (e) {
      e.preventDefault();

      // Clear previous errors
      _.each(self.errorElems, function (elem) {
        $(elem).html('');
      });

      var formData = $(this).serializeArray();
      self.validate(formData);
    });
  };

  /*
   * @public
   * Creates a form with validation requirements. Exposes the form as a
   * property namespaced by the Regulate object (ie: Regulate.<name of form>).
   * @param name String - The name of the form to be validated.
   * @param formRules - Array - The required rules for validation.
   */
  Regulate = function (name, formRules) {
    if (Regulate[name]) {
      throw new Error(name + 'is already being validated');
    }
    Regulate[name] = new Form(name, formRules);
  };

  /*
   * @public
   * Exposes all validation rules.
   */
  Regulate.Rules = Rules;

  /*
   * @public
   * Exposes all error message generators.
   */
  Regulate.Messages = Messages;

  /*
   * @public
   * Registers an user defined rule.
   * @param ruleName String - The name of the rule.
   * @param testFn Function - The function to be executed during validation.
   *    @return A boolean value that represents the validation result.
   */
  Regulate.registerRule = function (ruleName, testFn) {
    if (Regulate.Rules[ruleName]) {
      throw new Error(ruleName + " is already defined as a rule.");
    }
    Regulate.Rules[ruleName] = testFn;
  };

  /*
   * @public
   * Adds the given translations to be used for internationalization.
   */
  Regulate.addTranslation = function (langName, translation) {
    MessageTranslations[langName] = translation;
  };

  /*
   * @public
   * Use the corresponding message translations for the requested language.
   */
  Regulate.useTranslation = function (langName) {
    Messages = MessageTranslations[langName];
  };

  root.Regulate = Regulate;

}(this, _, jQuery));