odoo.define('odoo_attendance_user_location.my_attendances', function(require) {
    "use strict";

    var MyAttendances = require("hr_attendance.my_attendances");
    var KioskConfirm = require("hr_attendance.kiosk_confirm");
    const session = require("web.session");
    var Dialog = require("web.Dialog");
    var core = require("web.core");
    var QWeb = core.qweb;

    const HR_EMPLOYEE_MODEL = 'hr.employee';
    const ACTION_ATTENDANCE = 'hr_attendance.hr_attendance_action_my_attendances';

    MyAttendances.include({
        start: function() {
            // Call the parent class start method first
            this._super.apply(this, arguments);
            console.log("Start method called. Initializing attendance...");

            // Initialize the attendance property
            this.attendance = this.attendance || {}; // Ensure attendance is initialized
            this.attendance.check_in = this.attendance.check_in || {}; // Ensure check_in is initialized

            // Check if attendance.check_in is available before assigning clone
            if (this.attendance.check_in) {
                this.attendance.check_in.clone = this._cloneObject.bind(this, this.attendance.check_in);
                console.log("Attendance check_in initialized:", this.attendance.check_in);
            } else {
                console.error("Error: attendance.check_in is undefined.");
            }
        },

        update_attendance: function() {
            if (navigator.geolocation) {
                this.getCurrentPosition().then((position) => {
                    const ctx = Object.assign(session.user_context, {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });

                    return this._rpc({
                        model: HR_EMPLOYEE_MODEL,
                        method: 'attendance_manual',
                        args: [[this.employee.id], ACTION_ATTENDANCE],
                        context: ctx,
                    });
                }).then((result) => {
                    this.handleResult(result);
                }).catch((error) => {
                    this.handleGeolocationError(error);
                });
            } else {
                this.performAttendanceAction();
            }
        },

        getCurrentPosition: function() {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
        },

        handleResult: function(result) {
            if (result.action) {
                this.do_action(result.action);
            } else if (result.warning) {
                this.displayNotification({
                    title: result.warning,
                    type: 'danger'
                });
            }
        },

        handleGeolocationError: function(error) {
            const errorMessage = error.message || "Unable to get location.";
            var MyDialog = new Dialog(null, {
                title: error.__proto__.constructor.name,
                size: "medium",
                $content: this.$('<main/>', {
                    role: 'alert',
                    text: errorMessage + ". Also check your site connection is secured!",
                }),
                buttons: [{
                    text: "OK",
                    classes: "btn-primary",
                    click: function() {
                        MyDialog.close();
                    }
                }]
            });
            MyDialog.open();
        },

        performAttendanceAction: function() {
            this._rpc({
                model: HR_EMPLOYEE_MODEL,
                method: 'attendance_manual',
                args: [[this.employee.id], ACTION_ATTENDANCE],
                context: session.user_context,
            }).then(this.handleResult.bind(this));
        },

        // Custom clone function
        _cloneObject: function(obj) {
            var clonedObj = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = obj[key];
                }
            }
            return clonedObj;
        },
    });

    KioskConfirm.include({
        events: _.extend(KioskConfirm.prototype.events, {
            "click .o_hr_attendance_sign_in_out_icon": _.debounce(function() {
                this.handleKioskSignInOut(this.employee_id, this.next_action);
            }.bind(this), 200, true),  // Properly bind the context
            "click .o_hr_attendance_pin_pad_button_ok": _.debounce(function() {
                this.handlePinPadButton(this.employee_id, this.next_action, this.$('.o_hr_attendance_PINbox').val());
            }.bind(this), 200, true),  // Properly bind the context
        }),

        getCurrentPosition: function() {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
        },

        handleKioskSignInOut: function(employee_id, next_action) {
            if (navigator.geolocation) {
                this.getCurrentPosition().then((position) => {
                    const ctx = Object.assign(session.user_context, {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    return this._rpc({
                        model: HR_EMPLOYEE_MODEL,
                        method: 'attendance_manual',
                        args: [[employee_id], next_action],
                        context: ctx,
                    });
                }).then(this.handleResult.bind(this)).catch(this.handleGeolocationError.bind(this));
            }
        },

        handlePinPadButton: function(employee_id, next_action, pin) {
            this.pin_pad = true;
            if (navigator.geolocation) {
                this.getCurrentPosition().then((position) => {
                    const ctx = Object.assign(session.user_context, {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    return this._rpc({
                        model: HR_EMPLOYEE_MODEL,
                        method: 'attendance_manual',
                        args: [[employee_id], next_action, pin],
                        context: ctx,
                    });
                }).then(this.handleResult.bind(this)).catch(this.handleGeolocationError.bind(this));
            }
        },
    });
});
