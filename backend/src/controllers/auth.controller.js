const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendOtpEmail } = require('../utils/mailer');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { loginId, email, password, role } = req.body;

    // Validation
    if (!loginId || loginId.length < 6 || loginId.length > 12) {
      return res.status(400).json({ error: 'Login ID must be 6–12 characters.' });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}/.test(password)) {
      return res.status(400).json({ error: 'Password needs 8+ chars, uppercase, lowercase and special character.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        loginId,
        email,
        password: hash,
        role: role === 'MANAGER' ? 'MANAGER' : 'STAFF',
      },
      select: { id: true, loginId: true, email: true, role: true },
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { loginId } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid login ID or password.' });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, loginId: user.loginId, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password  – step 1: send OTP
const forgotPassword = async (req, res, next) => {
  try {
    const { loginId } = req.body;
    const user = await prisma.user.findUnique({ where: { loginId } });
    if (!user) return res.status(404).json({ error: 'Login ID not found.' });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry },
    });

    await sendOtpEmail(user.email, otp);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password  – step 2: verify OTP + set new password
const resetPassword = async (req, res, next) => {
  try {
    const { loginId, otp, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { loginId } });

    if (!user || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}/.test(newPassword)) {
      return res.status(400).json({ error: 'New password does not meet requirements.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, otp: null, otpExpiry: null },
    });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // Email cannot be changed by the user via profile update
    // (For security and identity consistency.)

    const data = {};
    if (newPassword) {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}/.test(newPassword)) {
        return res.status(400).json({ error: 'Password does not meet requirements.' });
      }
      data.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No allowed profile fields provided.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, loginId: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, forgotPassword, resetPassword, getMe, updateProfile };
