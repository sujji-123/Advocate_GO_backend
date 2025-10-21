// utils/mailer.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // IMPORTANT: For Gmail, this MUST be an "App Password"
    },
});

export async function sendOtpEmail(to, otp) {
    const mailOptions = {
        from: `"AdvocateGO" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Your AdvocateGO Verification Code',
        text: `Your verification code is ${otp}. It will expire in 10 minutes.`,
        html: `<p>Your verification code is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`,
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${to}. Error:`, error);
        // We re-throw the error so the calling function in auth.js knows it failed
        throw error;
    }
}

export async function sendPasswordResetEmail(to, token) {
    const resetUrl = `http://localhost:3000/reset-password/${token}`;
    const mailOptions = {
        from: `"AdvocateGO" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Reset Your AdvocateGO Password',
        text: `You requested a password reset. Click the following link: ${resetUrl}`,
        html: `
            <p>You requested a password reset for your AdvocateGO account.</p>
            <p>Please click the button below to set a new password:</p>
            <a href="${resetUrl}" style="background-color: #14B8A6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send password reset to ${to}. Error:`, error);
        throw error;
    }
}