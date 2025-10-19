// Mock user data for testing the admin panel without database connection
const mockUsers = [
  {
    user_id: 1,
    full_name: 'John Doe',
    email: 'john.doe@university.edu',
    phone: '+8801700000001',
    institution: 'University of Technology',
    location: 'Dhaka, Bangladesh',
    role_name: 'user',
    created_at: '2024-01-15T10:30:00Z',
    login_count: 25,
    last_login: '2024-10-07T14:20:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 2,
    full_name: 'Jane Smith',
    email: 'jane.smith@business.edu',
    phone: '+8801700000002',
    institution: 'Business University',
    location: 'Chittagong, Bangladesh',
    role_name: 'business_owner',
    created_at: '2024-02-20T09:15:00Z',
    login_count: 42,
    last_login: '2024-10-08T11:45:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 3,
    full_name: 'Bob Johnson',
    email: 'bob.johnson@culinary.edu',
    phone: '+8801700000003',
    institution: 'Culinary Institute',
    location: 'Sylhet, Bangladesh',
    role_name: 'food_vendor',
    created_at: '2024-03-10T16:45:00Z',
    login_count: 18,
    last_login: '2024-10-06T18:30:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 4,
    full_name: 'Alice Brown',
    email: 'alice.brown@science.edu',
    phone: '+8801700000004',
    institution: 'Science University',
    location: 'Rajshahi, Bangladesh',
    role_name: 'user',
    created_at: '2024-04-05T12:00:00Z',
    login_count: 33,
    last_login: '2024-10-07T20:15:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 5,
    full_name: 'Charlie Wilson',
    email: 'charlie.wilson@admin.edu',
    phone: '+8801700000005',
    institution: 'Admin College',
    location: 'Khulna, Bangladesh',
    role_name: 'moderator',
    created_at: '2024-05-12T08:30:00Z',
    login_count: 67,
    last_login: '2024-10-08T09:20:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 6,
    full_name: 'Diana Prince',
    email: 'diana.prince@arts.edu',
    phone: '+8801700000006',
    institution: 'Arts University',
    location: 'Barisal, Bangladesh',
    role_name: 'user',
    created_at: '2024-06-18T14:20:00Z',
    login_count: 15,
    last_login: '2024-10-05T16:40:00Z',
    is_email_verified: false,
    profile_picture: null
  },
  {
    user_id: 7,
    full_name: 'Edward Norton',
    email: 'edward.norton@tech.edu',
    phone: '+8801700000007',
    institution: 'Technology Institute',
    location: 'Rangpur, Bangladesh',
    role_name: 'business_owner',
    created_at: '2024-07-25T11:10:00Z',
    login_count: 28,
    last_login: '2024-10-07T13:25:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 8,
    full_name: 'Fiona Green',
    email: 'fiona.green@medical.edu',
    phone: '+8801700000008',
    institution: 'Medical University',
    location: 'Comilla, Bangladesh',
    role_name: 'user',
    created_at: '2024-08-14T17:35:00Z',
    login_count: 9,
    last_login: '2024-10-04T21:10:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 9,
    full_name: 'George Harris',
    email: 'george.harris@food.edu',
    phone: '+8801700000009',
    institution: 'Food Science Institute',
    location: 'Mymensingh, Bangladesh',
    role_name: 'food_vendor',
    created_at: '2024-09-02T13:45:00Z',
    login_count: 22,
    last_login: '2024-10-07T19:55:00Z',
    is_email_verified: true,
    profile_picture: null
  },
  {
    user_id: 10,
    full_name: 'Helen Davis',
    email: 'helen.davis@admin.edu',
    phone: '+8801700000010',
    institution: 'Administrative University',
    location: 'Jessore, Bangladesh',
    role_name: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    login_count: 156,
    last_login: '2024-10-08T10:30:00Z',
    is_email_verified: true,
    profile_picture: null
  }
];

console.log('Mock user data for testing:');
console.log(JSON.stringify(mockUsers, null, 2));
console.log(`\nTotal users: ${mockUsers.length}`);

// Export for use in other files
module.exports = mockUsers;