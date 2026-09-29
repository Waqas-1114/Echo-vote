import { Router } from 'express';
import { getUserByEmail, insertUser } from '../lib/db.js';
import { generateAnonymousId, generateToken, hashPassword, verifyPassword } from '../lib/auth.js';
import { AdminLevel, DEPARTMENTS, UserType } from '../lib/constants.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await getUserByEmail(email, { withJurisdiction: true });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check government officer verification status
        if (user.userType === UserType.GOVERNMENT_OFFICER && !user.governmentDetails?.isVerified) {
            return res.status(403).json({ error: 'Your account is pending verification. Please wait for admin approval.' });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            userType: user.userType,
            isAnonymous: user.isAnonymous,
        });

        // Return success response (exclude password)
        const userResponse = {
            id: user._id,
            email: user.email,
            userType: user.userType,
            profile: user.profile,
            isAnonymous: user.isAnonymous,
            anonymousId: user.anonymousId,
            governmentDetails: user.governmentDetails
                ? {
                      employeeId: user.governmentDetails.employeeId,
                      department: user.governmentDetails.department,
                      designation: user.governmentDetails.designation,
                      adminLevel: user.governmentDetails.adminLevel,
                      jurisdiction: user.governmentDetails.jurisdiction,
                      isVerified: user.governmentDetails.isVerified,
                  }
                : undefined,
        };

        return res.json({
            message: 'Login successful',
            user: userResponse,
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, userType, profile, governmentDetails } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Self-registration is limited to citizens and officers; admins are created by seed/DB only
        const accountType = userType || UserType.CITIZEN;
        if (![UserType.CITIZEN, UserType.GOVERNMENT_OFFICER].includes(accountType)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        if (accountType === UserType.GOVERNMENT_OFFICER) {
            if (!profile?.address?.state || !profile?.address?.district) {
                return res.status(400).json({ error: 'State and district are required for officers' });
            }
            if (!governmentDetails?.employeeId || !governmentDetails?.designation) {
                return res.status(400).json({ error: 'Employee ID and designation are required' });
            }
            if (!DEPARTMENTS.includes(governmentDetails.department)) {
                return res.status(400).json({ error: 'Please select a valid department' });
            }
            if (![AdminLevel.STATE, AdminLevel.DISTRICT, AdminLevel.BLOCK].includes(governmentDetails.adminLevel)) {
                return res.status(400).json({ error: 'Please select a valid administrative level' });
            }
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Prepare user data
        const userData = {
            email: email.toLowerCase(),
            password: hashedPassword,
            userType: accountType,
            profile: {
                name: profile?.name,
                phone: profile?.phone,
                address: profile?.address,
            },
            isActive: true,
        };

        // Handle government officer registration
        // The requested admin level and jurisdiction are confirmed by an admin on verification
        if (accountType === UserType.GOVERNMENT_OFFICER) {
            userData.governmentDetails = {
                employeeId: governmentDetails.employeeId,
                department: governmentDetails.department,
                designation: governmentDetails.designation,
                adminLevel: governmentDetails.adminLevel,
                isVerified: false, // Requires admin verification
                verificationDocuments: governmentDetails.verificationDocuments || [],
            };
        }

        // Handle anonymous users
        if (profile?.isAnonymous) {
            userData.isAnonymous = true;
            userData.anonymousId = generateAnonymousId();
        }

        // Create user
        const user = await insertUser(userData);

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            userType: user.userType,
            isAnonymous: user.isAnonymous,
        });

        // Return success response (exclude password)
        const userResponse = {
            id: user._id,
            email: user.email,
            userType: user.userType,
            profile: user.profile,
            isAnonymous: user.isAnonymous,
            anonymousId: user.anonymousId,
            governmentDetails: user.governmentDetails
                ? {
                      ...user.governmentDetails,
                      isVerified: user.governmentDetails.isVerified,
                  }
                : undefined,
        };

        return res.status(201).json({
            message:
                userType === UserType.GOVERNMENT_OFFICER
                    ? 'Registration successful. Your account will be verified by admin.'
                    : 'Registration successful',
            user: userResponse,
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
