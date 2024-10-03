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
            this.attendance = {
                check_in: {
                    clone: () => Object.assign({}, this) // Arrow function to maintain context
                }
            };
            this._super.apply(this, arguments);
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

        welcome_message: function() {
            console.log('this:', this); // Debugging statement
            console.log('this.attendance:', this.attendance); // Debugging statement

            if (this.attendance?.check_in?.clone) {
                var clonedCheckIn = this.attendance.check_in.clone();
                // Continue with your logic using clonedCheckIn...
            } else {
                console.error('check_in is not defined or clone is not a function');
            }
        },
    });

    KioskConfirm.include({
        events: _.extend(KioskConfirm.prototype.events, {
            "click .o_hr_attendance_sign_in_out_icon": _.debounce(function() {
                this.handleKioskSignInOut(this.employee_id, this.next_action);
            }, 200, true),
            "click .o_hr_attendance_pin_pad_button_ok": _.debounce(function() {
                this.handlePinPadButton(this.employee_id, this.next_action, this.$('.o_hr_attendance_PINbox').val());
            }, 200, true),
        }),

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
                        context: session.user_context,
                    });
                }).then(this.handleResult.bind(this)).catch(this.handleGeolocationError.bind(this));
            }
        },
    });
});
