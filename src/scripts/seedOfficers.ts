import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { Complaint } from '@/models/Complaint';
import bcrypt from 'bcryptjs';
import { UserType, AdminLevel, ComplaintStatus, ComplaintPriority } from '@/models/interfaces';
import { generateTicketNumber } from '@/lib/auth';

const officerSeedData = [
    // State Level Officers - Maharashtra
    {
        email: 'rajesh.kumar@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Rajesh Kumar',
            phone: '+91-9876543210',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-STATE-001',
            department: 'Public Works Department',
            designation: 'Chief Engineer',
            adminLevel: AdminLevel.STATE,
            isVerified: true
        }
    },
    {
        email: 'priya.sharma@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Priya Sharma',
            phone: '+91-9876543211',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-STATE-002',
            department: 'Health Department',
            designation: 'Director of Health Services',
            adminLevel: AdminLevel.STATE,
            isVerified: true
        }
    },
    {
        email: 'sandeep.rao@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Sandeep Rao',
            phone: '+91-9876543299',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-STATE-003',
            department: 'Water Supply Department',
            designation: 'Chief Water Engineer',
            adminLevel: AdminLevel.STATE,
            isVerified: true
        }
    },
    // District Level Officers
    {
        email: 'amit.patel@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Amit Patel',
            phone: '+91-9876543212',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-001',
            department: 'Public Works Department',
            designation: 'Executive Engineer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    {
        email: 'sneha.reddy@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Sneha Reddy',
            phone: '+91-9876543213',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-002',
            department: 'Water Supply Department',
            designation: 'Assistant Engineer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    {
        email: 'vikram.singh@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Vikram Singh',
            phone: '+91-9876543214',
            address: {
                state: 'Maharashtra',
                district: 'Pune',
                pincode: '411001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-PUNE-001',
            department: 'Public Works Department',
            designation: 'Executive Engineer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    {
        email: 'anita.desai@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Anita Desai',
            phone: '+91-9876543215',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-003',
            department: 'Health Department',
            designation: 'Medical Officer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    // Block Level Officers
    {
        email: 'rahul.verma@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Rahul Verma',
            phone: '+91-9876543216',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                block: 'Andheri',
                pincode: '400053'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-BLK-001',
            department: 'Public Works Department',
            designation: 'Junior Engineer',
            adminLevel: AdminLevel.BLOCK,
            isVerified: true
        }
    },
    {
        email: 'pooja.nair@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Pooja Nair',
            phone: '+91-9876543217',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                block: 'Bandra',
                pincode: '400050'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-BLK-002',
            department: 'Waste Management Department',
            designation: 'Sanitation Inspector',
            adminLevel: AdminLevel.BLOCK,
            isVerified: true
        }
    },
    {
        email: 'suresh.iyer@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Suresh Iyer',
            phone: '+91-9876543218',
            address: {
                state: 'Maharashtra',
                district: 'Mumbai',
                block: 'Borivali',
                pincode: '400092'
            }
        },
        governmentDetails: {
            employeeId: 'MH-MUM-BLK-003',
            department: 'Electricity Department',
            designation: 'Junior Engineer',
            adminLevel: AdminLevel.BLOCK,
            isVerified: true
        }
    },
    {
        email: 'kavita.joshi@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Kavita Joshi',
            phone: '+91-9876543219',
            address: {
                state: 'Maharashtra',
                district: 'Pune',
                block: 'Kothrud',
                pincode: '411038'
            }
        },
        governmentDetails: {
            employeeId: 'MH-PUNE-BLK-001',
            department: 'Public Works Department',
            designation: 'Junior Engineer',
            adminLevel: AdminLevel.BLOCK,
            isVerified: true
        }
    },
    // Additional District Officers for better coverage
    {
        email: 'deepak.mehta@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Deepak Mehta',
            phone: '+91-9876543220',
            address: {
                state: 'Maharashtra',
                district: 'Nagpur',
                pincode: '440001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-NAG-001',
            department: 'Public Works Department',
            designation: 'Executive Engineer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    {
        email: 'reshma.patil@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Reshma Patil',
            phone: '+91-9876543221',
            address: {
                state: 'Maharashtra',
                district: 'Nashik',
                pincode: '422001'
            }
        },
        governmentDetails: {
            employeeId: 'MH-NASH-001',
            department: 'Health Department',
            designation: 'District Health Officer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    },
    {
        email: 'manoj.deshmukh@gov.in',
        password: 'Officer@123',
        userType: UserType.GOVERNMENT_OFFICER,
        profile: {
            name: 'Manoj Deshmukh',
            phone: '+91-9876543222',
            address: {
                state: 'Maharashtra',
                district: 'Thane',
                pincode: '400601'
            }
        },
        governmentDetails: {
            employeeId: 'MH-THA-001',
            department: 'Electricity Department',
            designation: 'Chief Electrical Engineer',
            adminLevel: AdminLevel.DISTRICT,
            isVerified: true
        }
    }
];

const complaintSeedData = [
    // Mumbai - High Priority Complaints
    {
        title: 'Pothole on Main Road causing accidents',
        description: 'There is a large pothole on the main road near sector 5 that has been causing accidents. Multiple vehicles have been damaged and it poses a serious safety hazard especially during monsoon.',
        category: 'Road Maintenance',
        department: 'Public Works Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Andheri',
            address: 'Main Road, Sector 5, Near Metro Station'
        }
    },
    {
        title: 'Water supply disruption for 3 days',
        description: 'Our area has not received water supply for the past 3 days. This is causing severe hardship to residents and local businesses. We request immediate action.',
        category: 'Water Supply',
        department: 'Water Supply Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Bandra',
            address: 'Hill Road, Bandra West'
        }
    },
    {
        title: 'Overflowing garbage bins not cleared',
        description: 'Garbage bins in our locality have been overflowing for over a week. This is causing foul smell and attracting pests. Municipal workers have not visited for collection.',
        category: 'Waste Management',
        department: 'Waste Management Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Bandra',
            address: 'Linking Road, Near Market'
        }
    },
    {
        title: 'Street lights not working in residential area',
        description: 'All street lights in our residential colony have stopped working for the past 2 weeks. This is a major safety concern especially for women and elderly residents.',
        category: 'Electricity',
        department: 'Electricity Department',
        priority: ComplaintPriority.MEDIUM,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Borivali',
            address: 'Green Valley Colony, Borivali West'
        }
    },
    {
        title: 'Primary Health Center lacking basic medicines',
        description: 'The local PHC does not have basic medicines like antibiotics and painkillers in stock. Patients are being sent away without treatment.',
        category: 'Healthcare',
        department: 'Health Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            address: 'Primary Health Center, Dahisar East'
        }
    },
    // Pune Complaints
    {
        title: 'Damaged bridge needs urgent repair',
        description: 'The pedestrian bridge near the railway station has visible cracks and damage. It is unsafe for public use and needs immediate inspection and repair.',
        category: 'Infrastructure',
        department: 'Public Works Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            block: 'Kothrud',
            address: 'Near Kothrud Railway Station'
        }
    },
    {
        title: 'Illegal construction blocking drainage',
        description: 'Unauthorized construction on our street is blocking the drainage system causing water logging during rains. Request inspection and action.',
        category: 'Infrastructure',
        department: 'Public Works Department',
        priority: ComplaintPriority.MEDIUM,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Andheri',
            address: 'SV Road, Andheri West'
        }
    },
    {
        title: 'Public toilet facility non-functional',
        description: 'The public toilet near the bus stand has been non-functional for months. Water supply and sanitation are completely broken.',
        category: 'Public Services',
        department: 'Public Works Department',
        priority: ComplaintPriority.MEDIUM,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            address: 'Near Central Bus Stand, Swargate'
        }
    },
    // Additional Complaints - Mumbai
    {
        title: 'Water pipeline burst flooding streets',
        description: 'Major water pipeline has burst near the market area causing massive flooding. Water is being wasted and shops are affected.',
        category: 'Water Supply',
        department: 'Water Supply Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Andheri',
            address: 'Market Road, Andheri East'
        }
    },
    {
        title: 'Hospital emergency ward understaffed',
        description: 'The district hospital emergency ward is critically understaffed. Patients are waiting for hours without attention.',
        category: 'Healthcare',
        department: 'Health Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            address: 'District Hospital, Mulund'
        }
    },
    {
        title: 'Power outages for 8+ hours daily',
        description: 'Our area experiences power cuts of 8-10 hours every day. This is affecting businesses, students, and elderly residents.',
        category: 'Electricity',
        department: 'Electricity Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Borivali',
            address: 'IC Colony, Borivali West'
        }
    },
    {
        title: 'Broken traffic signals causing accidents',
        description: 'Traffic signals at major intersection have been non-functional for 2 weeks. Multiple accidents have occurred.',
        category: 'Traffic Management',
        department: 'Public Works Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Bandra',
            address: 'Bandra-Kurla Complex Junction'
        }
    },
    {
        title: 'Sewage overflow in residential area',
        description: 'Sewage is overflowing on streets for the past week. Health hazard and unbearable smell affecting entire neighborhood.',
        category: 'Sanitation',
        department: 'Water Supply Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Andheri',
            address: 'Seven Bungalows, Andheri West'
        }
    },
    // Pune Additional Complaints
    {
        title: 'School building in dangerous condition',
        description: 'Municipal school building has major structural cracks. Unsafe for 500+ students attending daily.',
        category: 'Education',
        department: 'Public Works Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            block: 'Kothrud',
            address: 'Kothrud Municipal School'
        }
    },
    {
        title: 'Bus shelter collapsed injuring passengers',
        description: 'Old bus shelter collapsed yesterday injuring 3 people. Other shelters in area also in poor condition.',
        category: 'Public Transport',
        department: 'Public Works Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            address: 'FC Road Bus Stop'
        }
    },
    {
        title: 'Contaminated water supply causing illness',
        description: 'Multiple residents have fallen ill due to contaminated water supply. Water appears muddy and has foul smell.',
        category: 'Water Supply',
        department: 'Water Supply Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            block: 'Kothrud',
            address: 'Paud Road Area'
        }
    },
    {
        title: 'Park equipment broken and dangerous',
        description: 'Children\'s park equipment is broken with sharp edges. Several children have been injured.',
        category: 'Public Parks',
        department: 'Public Works Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            address: 'Shivaji Nagar Garden'
        }
    },
    // Nagpur Complaints
    {
        title: 'Major road cave-in blocking traffic',
        description: 'Large portion of main road has caved in completely blocking traffic. Emergency repairs needed immediately.',
        category: 'Road Maintenance',
        department: 'Public Works Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Nagpur',
            address: 'Wardha Road, Near Medical Square'
        }
    },
    {
        title: 'Vaccination center without vaccines',
        description: 'District vaccination center has run out of essential vaccines for children. Parents traveling from far are being turned away.',
        category: 'Healthcare',
        department: 'Health Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Nagpur',
            address: 'Civil Lines Health Center'
        }
    },
    // Nashik Complaints
    {
        title: 'Hospital equipment non-functional',
        description: 'Critical medical equipment including X-ray and ultrasound machines not working for months. Patients sent to private clinics.',
        category: 'Healthcare',
        department: 'Health Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Nashik',
            address: 'District Hospital, Nashik Road'
        }
    },
    {
        title: 'Frequent transformer explosions',
        description: 'Electrical transformers in our area keep exploding. Three incidents in last month. Major fire risk.',
        category: 'Electricity',
        department: 'Electricity Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Nashik',
            address: 'College Road Area'
        }
    },
    // Thane Complaints
    {
        title: 'Railway overbridge unsafe for pedestrians',
        description: 'Railway overbridge has rusted railings and broken steps. Used by thousands of commuters daily.',
        category: 'Infrastructure',
        department: 'Public Works Department',
        priority: ComplaintPriority.HIGH,
        location: {
            state: 'Maharashtra',
            district: 'Thane',
            address: 'Thane Railway Station Overbridge'
        }
    },
    {
        title: 'Industrial pollution affecting residents',
        description: 'Industrial units releasing toxic fumes and chemicals. Residents experiencing breathing problems and skin issues.',
        category: 'Environment',
        department: 'Health Department',
        priority: ComplaintPriority.CRITICAL,
        location: {
            state: 'Maharashtra',
            district: 'Thane',
            address: 'TTC Industrial Area'
        }
    },
    // Lower Priority Maintenance Issues
    {
        title: 'Park maintenance neglected',
        description: 'Local park has not been maintained for months. Overgrown grass, broken benches, and no lighting.',
        category: 'Public Parks',
        department: 'Public Works Department',
        priority: ComplaintPriority.LOW,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Bandra',
            address: 'Bandra Bandstand Garden'
        }
    },
    {
        title: 'Community hall needs renovation',
        description: 'Community hall building is old and needs painting, electrical repairs, and furniture replacement.',
        category: 'Public Buildings',
        department: 'Public Works Department',
        priority: ComplaintPriority.LOW,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            address: 'Deccan Gymkhana Community Hall'
        }
    },
    {
        title: 'Speed breakers needed on school road',
        description: 'Vehicles speed past school area. Need speed breakers for safety of children.',
        category: 'Traffic Management',
        department: 'Public Works Department',
        priority: ComplaintPriority.MEDIUM,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Andheri',
            address: 'Near St. Mary\'s School, Andheri'
        }
    },
    {
        title: 'Bus frequency reduced causing overcrowding',
        description: 'Public bus frequency has been reduced on this route causing severe overcrowding and long waits.',
        category: 'Public Transport',
        department: 'Public Works Department',
        priority: ComplaintPriority.MEDIUM,
        location: {
            state: 'Maharashtra',
            district: 'Mumbai',
            block: 'Borivali',
            address: 'Borivali Station to Gorai Route'
        }
    },
    {
        title: 'Library lacks books and facilities',
        description: 'Public library has very few books, no computers, and poor seating. Needs upgradation.',
        category: 'Education',
        department: 'Public Works Department',
        priority: ComplaintPriority.LOW,
        location: {
            state: 'Maharashtra',
            district: 'Pune',
            address: 'Sadashiv Peth Public Library'
        }
    }
];

export async function seedOfficersAndComplaints() {
    try {
        await dbConnect();
        console.log('Connected to MongoDB');

        // Create officers
        console.log('\n=== Creating Officers ===');
        const createdOfficers = [];

        for (const officerData of officerSeedData) {
            const existingOfficer = await User.findOne({ email: officerData.email });
            if (existingOfficer) {
                console.log(`Officer ${officerData.profile.name} already exists`);
                createdOfficers.push(existingOfficer);
                continue;
            }

            const hashedPassword = await bcrypt.hash(officerData.password, 10);

            // Find jurisdiction
            let jurisdiction;
            if (officerData.governmentDetails.adminLevel === AdminLevel.STATE) {
                jurisdiction = await AdministrativeDivision.findOne({
                    state: officerData.profile.address.state,
                    level: AdminLevel.STATE
                });
            } else if (officerData.governmentDetails.adminLevel === AdminLevel.DISTRICT) {
                jurisdiction = await AdministrativeDivision.findOne({
                    state: officerData.profile.address.state,
                    district: officerData.profile.address.district,
                    level: AdminLevel.DISTRICT
                });
            } else if (officerData.governmentDetails.adminLevel === AdminLevel.BLOCK) {
                jurisdiction = await AdministrativeDivision.findOne({
                    state: officerData.profile.address.state,
                    district: officerData.profile.address.district,
                    level: AdminLevel.BLOCK
                });
            }

            if (!jurisdiction) {
                console.log(`⚠️  Creating division for ${officerData.profile.name}`);
                jurisdiction = await AdministrativeDivision.create({
                    name: officerData.profile.address.district || officerData.profile.address.state,
                    code: `${officerData.profile.address.state?.substring(0, 2).toUpperCase()}-${Date.now()}`,
                    level: officerData.governmentDetails.adminLevel,
                    state: officerData.profile.address.state,
                    district: officerData.profile.address.district,
                    departments: [officerData.governmentDetails.department],
                    isActive: true
                });
            }

            const officer = await User.create({
                ...officerData,
                password: hashedPassword,
                governmentDetails: {
                    ...officerData.governmentDetails,
                    jurisdiction: jurisdiction._id
                },
                isActive: true
            });

            createdOfficers.push(officer);
            console.log(`✓ Created officer: ${officer.profile.name} (${officer.governmentDetails.designation})`);
        }

        // Create some citizens for complaints
        console.log('\n=== Creating Citizens ===');
        const citizenData = [
            { email: 'citizen1@test.com', name: 'Ramesh Gupta', state: 'Maharashtra', district: 'Mumbai' },
            { email: 'citizen2@test.com', name: 'Sunita Rao', state: 'Maharashtra', district: 'Pune' },
            { email: 'citizen3@test.com', name: 'Anil Mehta', state: 'Maharashtra', district: 'Mumbai' }
        ];
        const citizens = [];

        for (let i = 0; i < citizenData.length; i++) {
            const data = citizenData[i];
            let citizen = await User.findOne({ email: data.email });
            if (!citizen) {
                const hashedPassword = await bcrypt.hash('Citizen@123', 10);
                citizen = await User.create({
                    email: data.email,
                    password: hashedPassword,
                    userType: UserType.CITIZEN,
                    profile: {
                        name: data.name,
                        phone: `+91-98765432${20 + i}`,
                        address: {
                            state: data.state,
                            district: data.district
                        }
                    },
                    isActive: true,
                    isAnonymous: false
                });
                console.log(`✓ Created citizen: ${citizen.email}`);
            }
            citizens.push(citizen);
        }

        // Create complaints and assign to officers
        console.log('\n=== Creating Complaints ===');
        
        // Find Amit Patel (Mumbai District Officer) to assign most complaints to him
        const amitPatel = createdOfficers.find(o => o.email === 'amit.patel@gov.in');
        
        for (let i = 0; i < complaintSeedData.length; i++) {
            const complaintData = complaintSeedData[i];
            const citizen = citizens[i % citizens.length];

            // Find appropriate jurisdiction
            let jurisdiction = await AdministrativeDivision.findOne({
                state: complaintData.location.state,
                district: complaintData.location.district,
                level: AdminLevel.DISTRICT
            });

            if (!jurisdiction) {
                jurisdiction = await AdministrativeDivision.findOne({
                    state: complaintData.location.state,
                    level: AdminLevel.STATE
                });
            }

            if (!jurisdiction) continue;

            // Assign officer based on location and department
            let assignedOfficer = null;
            
            // If complaint is from Mumbai and PWD department, assign to Amit Patel
            if (complaintData.location.district === 'Mumbai' && 
                complaintData.department === 'Public Works Department' && 
                amitPatel) {
                assignedOfficer = amitPatel;
            } else {
                // Otherwise, find appropriate officer
                const officers = createdOfficers.filter(o =>
                    o.governmentDetails.department === complaintData.department &&
                    o.profile.address.state === complaintData.location.state &&
                    o.governmentDetails.adminLevel === AdminLevel.DISTRICT
                );
                assignedOfficer = officers.length > 0 ? officers[Math.floor(Math.random() * officers.length)] : null;
            }

            const ticketNumber = generateTicketNumber(
                complaintData.location.state,
                complaintData.location.district
            );

            // Vary the statuses to show different stages
            let status;
            if (i % 6 === 0) {
                status = ComplaintStatus.SUBMITTED; // Some pending acknowledgment
            } else if (i % 6 === 1 || i % 6 === 2) {
                status = ComplaintStatus.IN_PROGRESS; // Most in progress
            } else if (i % 6 === 3) {
                status = ComplaintStatus.ACKNOWLEDGED; // Some just acknowledged
            } else {
                status = ComplaintStatus.IN_PROGRESS; // Default to in progress
            }

            const complaint = await Complaint.create({
                ticketNumber,
                title: complaintData.title,
                description: complaintData.description,
                category: complaintData.category,
                priority: complaintData.priority,
                status,
                location: complaintData.location,
                submittedBy: {
                    userId: citizen._id
                },
                assignedTo: {
                    division: jurisdiction._id,
                    department: complaintData.department,
                    officers: assignedOfficer ? [assignedOfficer._id] : []
                },
                statusHistory: [
                    {
                        status: ComplaintStatus.SUBMITTED,
                        updatedBy: citizen._id,
                        comments: 'Complaint submitted',
                        updatedAt: new Date(Date.now() - (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000) // 7-21 days ago
                    }
                ],
                escalationHistory: [],
                attachments: [],
                publicSupport: {
                    upvotes: Math.floor(Math.random() * 50),
                    comments: []
                },
                isPublic: true,
                tags: [complaintData.category],
                createdAt: new Date(Date.now() - (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000)
            });

            if (status !== ComplaintStatus.SUBMITTED && assignedOfficer) {
                complaint.statusHistory.push({
                    status: ComplaintStatus.ACKNOWLEDGED,
                    updatedBy: assignedOfficer._id,
                    comments: 'Complaint acknowledged and under review',
                    updatedAt: new Date(Date.now() - (5 + Math.floor(Math.random() * 10)) * 24 * 60 * 60 * 1000) // 5-15 days ago
                });

                if (status === ComplaintStatus.IN_PROGRESS) {
                    complaint.statusHistory.push({
                        status: ComplaintStatus.IN_PROGRESS,
                        updatedBy: assignedOfficer._id,
                        comments: 'Work has been initiated. Team deployed to the site.',
                        updatedAt: new Date(Date.now() - (3 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000) // 3-10 days ago
                    });

                    // Add proof of work to 40% of in-progress complaints
                    if (i % 5 < 2) {
                        complaint.proofOfWork = [{
                            description: 'Initial work completed - materials procured and team deployed',
                            workDetails: 'Surveyed the site, identified the issues, and started remedial work. Materials have been sourced from approved vendors. Work is progressing as per schedule.',
                            photos: [
                                'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Work+In+Progress+Photo+1',
                                'https://via.placeholder.com/800x600/2196F3/FFFFFF?text=Work+In+Progress+Photo+2'
                            ],
                            submittedBy: assignedOfficer._id,
                            submittedAt: new Date(Date.now() - (2 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000)
                        }];
                    }

                    // Mark 20% as resolved
                    if (i % 5 === 0) {
                        complaint.status = ComplaintStatus.RESOLVED;
                        complaint.statusHistory.push({
                            status: ComplaintStatus.RESOLVED,
                            updatedBy: assignedOfficer._id,
                            comments: 'Work completed successfully. Resolution verified and documented. All quality checks passed.',
                            updatedAt: new Date(Date.now() - (1 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000) // 1-3 days ago
                        });
                        complaint.proofOfWork = [{
                            description: 'Work completed - final inspection done',
                            workDetails: 'All work has been completed as per standards. Quality checks passed. Site has been cleaned and restored. Before and after photos attached.',
                            photos: [
                                'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Completed+Work+Photo+1',
                                'https://via.placeholder.com/800x600/8BC34A/FFFFFF?text=Completed+Work+Photo+2',
                                'https://via.placeholder.com/800x600/CDDC39/FFFFFF?text=Completed+Work+Photo+3'
                            ],
                            submittedBy: assignedOfficer._id,
                            submittedAt: new Date(Date.now() - (1 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000)
                        }];
                    }
                }

                await complaint.save();
            }

            console.log(`✓ Created complaint: ${complaint.ticketNumber} - ${complaint.title.substring(0, 40)}...`);
            if (assignedOfficer) {
                console.log(`  Assigned to: ${assignedOfficer.profile.name} (${assignedOfficer.governmentDetails.designation})`);
            }
        }

        console.log('\n=== Seed Data Summary ===');
        console.log(`Officers created: ${createdOfficers.length}`);
        console.log(`Citizens created: ${citizens.length}`);
        console.log(`Complaints created: ${complaintSeedData.length}`);

        console.log('\n=== Login Credentials ===');
        console.log('All officers: password = Officer@123');
        console.log('Sample officer emails:');
        officerSeedData.slice(0, 5).forEach(o => {
            console.log(`  - ${o.email} (${o.profile.name} - ${o.governmentDetails.designation})`);
        });

        return {
            officers: createdOfficers,
            citizens,
            success: true
        };

    } catch (error) {
        console.error('Error seeding data:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedOfficersAndComplaints()
        .then(() => {
            console.log('\n✓ Seeding completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('✗ Seeding failed:', error);
            process.exit(1);
        });
}
