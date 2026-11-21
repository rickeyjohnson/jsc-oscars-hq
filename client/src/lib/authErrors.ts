export const loginErrorText = (message: string): string =>
    /invalid login credentials|invalid_credentials/i.test(message) ? "Incorrect email or password." : message

export const signupErrorText = (message: string): string =>
    /not available|database error saving new user/i.test(message)
        ? "That name is already claimed or not on the list."
        : message
