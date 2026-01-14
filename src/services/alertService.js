// src/services/alertService.js

let alertRef = null;

export const AlertService = {
    // 1. Register the UI Component (Called once by GlobalAlertModal)
    setRef: (ref) => {
        alertRef = ref;
    },

    // 2. Hide Alert
    close: () => {
        if (alertRef) alertRef.close();
    },

    // 3. Generic Show Method
    show: ({ title, message, type = 'info', buttons = [], onDismiss }) => {
        if (alertRef) {
            alertRef.open({ title, message, type, buttons, onDismiss });
        }
    },

    // --- SHORTCUTS ---

    // Success: Shows Green Check + OK button
    success: (title, message, onOk) => {
        AlertService.show({
            title,
            message,
            type: 'success',
            buttons: [{ text: 'حسنا', style: 'primary', onPress: onOk }]
        });
    },

    // Error: Shows Red X + OK button
    error: (title, message) => {
        AlertService.show({
            title,
            message,
            type: 'error',
            buttons: [{ text: 'إغلاق', style: 'destructive' }]
        });
    },

    // Confirm: Shows Question + Cancel/Confirm buttons
    confirm: (title, message, onConfirm, onCancel) => {
        AlertService.show({
            title,
            message,
            type: 'warning',
            buttons: [
                { text: 'إلغاء', style: 'secondary', onPress: onCancel },
                { text: 'تأكيد', style: 'primary', onPress: onConfirm }
            ]
        });
    },
    
    // Delete Confirm: Specific Red styling for delete actions
    delete: (title, message, onDelete) => {
        AlertService.show({
            title,
            message,
            type: 'delete',
            buttons: [
                { text: 'تراجع', style: 'secondary' },
                { text: 'حذف', style: 'destructive', onPress: onDelete }
            ]
        });
    }
};