// routes/auth.js (Updated with detailed logging for debugging)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    // Log token generation attempt
    console.log(`Attempting to generate token for userId: ${userId}`);
    try {
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });
        console.log('JWT token generated successfully.');
        return token;
    } catch (tokenError) {
        console.error('Error generating JWT token:', tokenError.message);
        // Re-throw to be caught by the main route's catch block
        throw new Error('Failed to generate authentication token.');
    }
};

// Register
router.post('/register', validate(schemas.register), async (req, res, next) => {
    console.log('--- Register Endpoint Hit ---');
    console.log('Request Body:', req.body); // Log the incoming request body

    try {
        const { email, password, username } = req.body;
        console.log(`Received registration request for email: ${email}, username: ${username}`);

        // Step 1: Check if user exists
        console.log('Checking for existing user with email or username...');
        const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('id')
            .or(`email.eq.${email},username.eq.${username}`)
            .single();

        if (existingUserError && existingUserError.code !== 'PGRST116') { // PGRST116 means no row found, which is expected if user doesn't exist
            console.error('Supabase error during existing user check:', existingUserError.message);
            // If it's a real database error, re-throw it
            throw new Error(`Database error during user existence check: ${existingUserError.message}`);
        }

        if (existingUser) {
            console.warn(`Registration attempt for existing user. Email: ${email}, Username: ${username}`);
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }
        console.log('No existing user found with this email or username. Proceeding with registration.');

        // Step 2: Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);
        console.log('Password hashed successfully.');

        // Step 3: Create user
        console.log('Attempting to insert new user into database...');
        const { data: user, error: insertError } = await supabase
            .from('users')
            .insert([{
                email,
                username,
                // Changed 'password' to 'password_hash' to match your Supabase schema
                password_hash: hashedPassword,
                role: 'user',
                is_active: true
            }])
            .select('id, email, username, role')
            .single(); // Using .single() here means it expects exactly one row back

        if (insertError) {
            console.error('Supabase error during user insertion:', insertError.message);
            // If there's an error during insertion, throw it to be caught by the main catch block
            throw new Error(`Database error during user creation: ${insertError.message}`);
        }

        if (!user) {
            // This case might happen if .single() returns null but no explicit error
            console.error('Supabase user insertion returned no data despite no explicit error.');
            throw new Error('User creation failed: No user data returned.');
        }

        console.log('New user created successfully:', user);

        // Step 4: Generate JWT token
        console.log('Generating authentication token...');
        const token = generateToken(user.id);
        console.log('Authentication token generated.');

        console.log('Registration successful! Sending response.');
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        console.error('--- General Registration Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack); // Full stack trace for detailed debugging

        // Pass the error to the next middleware (errorHandler)
        // This ensures your global error handler can process it
        next(error);

        // Or, if you want to handle it directly here and not pass to next()
        // res.status(500).json({
        //     success: false,
        //     message: 'Registration failed: An unexpected error occurred.'
        // });
    } finally {
        console.log('--- Register Endpoint Finished ---');
    }
});

// Login
router.post('/login', validate(schemas.login), async (req, res, next) => {
    console.log('--- Login Endpoint Hit ---');
    console.log('Request Body:', req.body);
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for email: ${email}`);

        // Find user
        console.log('Finding user by email...');
        const { data: user, error: findUserError } = await supabase
            .from('users')
            // Changed 'password' to 'password_hash' in select statement
            .select('id, email, username, password_hash, role, is_active')
            .eq('email', email)
            .single();

        if (findUserError && findUserError.code !== 'PGRST116') {
            console.error('Supabase error during user lookup for login:', findUserError.message);
            throw new Error(`Database error during login: ${findUserError.message}`);
        }

        if (!user || !user.is_active) {
            console.warn(`Login failed: User not found or inactive for email: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        console.log('User found. Checking password...');

        // Check password
        // Changed 'user.password' to 'user.password_hash' for comparison
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            console.warn(`Login failed: Invalid password for email: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        console.log('Password is valid.');

        const token = generateToken(user.id);
        console.log('Login successful! Sending response.');

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        console.error('--- General Login Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Login Endpoint Finished ---');
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
    console.log('--- Get Current User Endpoint Hit ---');
    console.log('Authenticated user ID:', req.user ? req.user.id : 'N/A');
    try {
        if (!req.user || !req.user.id) {
            console.warn('No user ID found in request for /me endpoint.');
            return res.status(401).json({
                success: false,
                message: 'Authentication required: User ID missing.'
            });
        }

        console.log(`Fetching user details for ID: ${req.user.id}`);
        const { data: user, error: fetchUserError } = await supabase
            .from('users')
            .select('id, email, username, role, created_at')
            .eq('id', req.user.id)
            .single();

        if (fetchUserError && fetchUserError.code !== 'PGRST116') {
            console.error('Supabase error during fetching current user:', fetchUserError.message);
            throw new Error(`Database error fetching user: ${fetchUserError.message}`);
        }

        if (!user) {
            console.warn(`User with ID ${req.user.id} not found in database.`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        console.log('User details fetched successfully:', user.id, user.username);

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('--- General Get User Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Get Current User Endpoint Finished ---');
    }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
    console.log('--- Logout Endpoint Hit ---');
    console.log('Logout is client-side token removal. No server-side action needed.');
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;
