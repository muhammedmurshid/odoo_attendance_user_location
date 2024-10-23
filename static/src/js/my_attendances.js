odoo.define('odoo_attendance_user_location.my_attendances', function(require) {
    "use strict";

    var MyAttendances = require("hr_attendance.my_attendances");
    var KioskConfirm = require("hr_attendance.kiosk_confirm");
    const session = require("web.session");
    var Dialog = require("web.Dialog");
    var core = require("web.core");
    var QWeb = core.qweb;
    var rpc = require('web.rpc');

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
                    return this.capturePhoto().then((photo) => {
                        const ctx = Object.assign(session.user_context, {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            photo: photo  // Add the captured photo to the context
                        });
                        console.log(ctx, 'ctx')
                        return this._rpc({
                            model: HR_EMPLOYEE_MODEL,
                            method: 'attendance_manual',
                            args: [[this.employee.id], ACTION_ATTENDANCE],
                            context: ctx,
                        });
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

        capturePhoto: function() {
            return new Promise((resolve, reject) => {
                const video = document.createElement('video');
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                    video.srcObject = stream;
                    video.play();

                    // Capture the photo after a short delay
                    setTimeout(() => {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataURL = canvas.toDataURL('image/png');
                        stream.getTracks().forEach(track => track.stop());  // Stop the video stream
                        resolve(dataURL);
                    }, 1000);
                }).catch(reject);
            });
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
                $content: $('<main>', {  // jQuery element creation
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
        }

//        handleGeolocationError: function(error) {
//            const errorMessage = error.message || "Unable to get location.";
//            var MyDialog = new Dialog(null, {
//                title: error.__proto__.constructor.name,
//                size: "medium",
//                $content: this.$('<main/>', {
//                    role: 'alert',
//                    text: errorMessage + ". Also check your site connection is secured!",
//                }),
//                buttons: [{
//                    text: "OK",
//                    classes: "btn-primary",
//                    click: function() {
//                        MyDialog.close();
//                    }
//                }]
//            });
//            MyDialog.open();
//        },

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
                        context: session.user_context,
                    });
                }).then(this.handleResult.bind(this)).catch(this.handleGeolocationError.bind(this));
            }
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

//        handleGeolocationError: function(error) {
//            const errorMessage = error.message || "Unable to get location.";
//            var MyDialog = new Dialog(null, {
//                title: error.__proto__.constructor.name,
//                size: "medium",
//                $content: this.$('<main/>', {
//                    role: 'alert',
//                    text: errorMessage + ". Also check your site connection is secured!",
//                }),
//                buttons: [{
//                    text: "OK",
//                    classes: "btn-primary",
//                    click: function() {
//                        MyDialog.close();
//                    }
//                }]
//            });
//            MyDialog.open();
//        },
    });
});
