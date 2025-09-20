import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch,
  FiFilter,
  FiMapPin,
  FiClock,
  FiBriefcase,
  FiGrid,
  FiList,
  FiTrendingUp,
  FiUser,
  FiDollarSign
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import ChatButton from '../components/chat/ChatButton';

// Jobs board mirrors SecondhandMarket structure but tailored for jobs
const JobsBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // all | full-time | part-time | freelance
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');
  const [salaryRange, setSalaryRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const jobTypes = [
    { id: 'all', name: 'All Jobs', icon: '🧭' },
    { id: 'full-time', name: 'Full-time', icon: '⏱️' },
    { id: 'part-time', name: 'Part-time', icon: '🕒' },
    { id: 'freelance', name: 'Freelance', icon: '💼' },
  ];

  const experienceLevels = [
    { id: 'all', name: 'All Levels' },
    { id: 'internship', name: 'Internship' },
    { id: 'entry', name: 'Entry' },
    { id: 'mid', name: 'Mid' },
    { id: 'senior', name: 'Senior' },
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' },
    { id: 'salary_high', name: 'Salary: High to Low' },
    { id: 'salary_low', name: 'Salary: Low to High' },
    { id: 'popular', name: 'Most Popular' },
  ];

  const dummyJobs = useMemo(() => ([
    {
      id: 'job-101',
      title: 'Frontend Developer (React)',
      company: 'Campus Tech Lab',
      type: 'part-time',
      salary: '৳25,000 - ৳35,000',
      location: 'Dhaka',
      postedAgo: '2 days ago',
      applicants: 14,
      recruiter: { id: 'rec-201', name: 'Sadia Rahman', avatar: '/placeholder/32/32', isVerified: true },
      tags: ['React', 'Tailwind', 'REST APIs'],
      experience: 'entry',
      description: 'Work with our team to build modern UI using React and Tailwind.'
    },
    {
      id: 'job-102',
      title: 'Teaching Assistant - CSE 1101',
      company: 'UIU CSE Department',
      type: 'part-time',
      salary: '৳15,000',
      location: 'Dhaka',
      postedAgo: '5 hours ago',
      applicants: 23,
      recruiter: { id: 'rec-202', name: 'Dr. Hasan', avatar: '/placeholder/32/32', isVerified: true },
      tags: ['Data Structures', 'Mentoring'],
      experience: 'internship',
      description: 'Assist in lab sessions, grading, and student support.'
    },
    {
      id: 'job-103',
      title: 'Software Engineer',
      company: 'InnovateX',
      type: 'full-time',
      salary: '৳55,000 - ৳75,000',
      location: 'Remote',
      postedAgo: '1 week ago',
      applicants: 42,
      recruiter: { id: 'rec-203', name: 'Arif Hossain', avatar: '/placeholder/32/32', isVerified: false },
      tags: ['Node.js', 'MongoDB', 'AWS'],
      experience: 'mid',
      description: 'Build scalable services, APIs, and integrations for our products.'
    },
    {
      id: 'job-104',
      title: 'Graphic Designer (Contract)',
      company: 'CreateCo',
      type: 'freelance',
      salary: '৳20,000 - ৳30,000 / project',
      location: 'Remote',
      postedAgo: '3 days ago',
      applicants: 8,
      recruiter: { id: 'rec-204', name: 'Nusrat Jahan', avatar: '/placeholder/32/32', isVerified: true },
      tags: ['Figma', 'Illustrator', 'Branding'],
      experience: 'entry',
      description: 'Design social media creatives and marketing collateral.'
    },
  ]), []);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedLocation, selectedExperience, sortBy]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedType !== 'all' ? selectedType : '',
        location: selectedLocation !== 'all' ? selectedLocation : '',
        experience: selectedExperience !== 'all' ? selectedExperience : '',
        sort: sortBy,
        search: searchTerm,
        ...(salaryRange.min && { minSalary: salaryRange.min }),
        ...(salaryRange.max && { maxSalary: salaryRange.max })
      });

      const response = await api.get(`/jobs?${params}`);
      const data = response?.data?.data ?? response?.data?.jobs ?? [];
      if (!Array.isArray(data) || data.length === 0) {
        // Fallback to dummy
        setJobs(dummyJobs);
      } else {
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Fallback to dummy data
      setJobs(dummyJobs);
      showNotification('Showing sample jobs (backend unavailable)', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const openJobModal = (job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const closeJobModal = () => {
    setShowJobModal(false);
    setSelectedJob(null);
  };

  const JobCard = ({ job }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => openJobModal(job)}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
            <div className="text-sm text-gray-600">{job.company}</div>
          </div>
          <span className="badge badge-primary capitalize flex items-center">
            <FiBriefcase className="w-3 h-3 mr-1" />
            {job.type?.replace('-', ' ') || 'job'}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex items-center"><FiMapPin className="w-3 h-3 mr-2" /> {job.location || 'N/A'}</div>
          <div className="flex items-center"><FiClock className="w-3 h-3 mr-2" /> {job.postedAgo || 'Recently'}</div>
          <div className="flex items-center"><FiUser className="w-3 h-3 mr-2" /> {job.applicants || 0} applicants</div>
          <div className="flex items-center"><FiDollarSign className="w-3 h-3 mr-2" /> {job.salary || 'Negotiable'}</div>
        </div>

        {job.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.tags.map((t) => (
              <span key={t} className="badge">{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <img src={job.recruiter?.avatar || '/placeholder/32/32'} alt={job.recruiter?.name} className="w-6 h-6 rounded-full" />
            <span className="text-sm text-gray-700">{job.recruiter?.name || 'Recruiter'}</span>
            {job.recruiter?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
          </div>
          <ChatButton
            sellerId={job.recruiter?.id || job.recruiter_id || 'recruiter-guest'}
            sellerName={job.recruiter?.name || 'Recruiter'}
            sellerType="business" 
            itemId={job.id}
            itemName={job.title}
            size="sm"
            variant="outline"
            // prevent opening modal when clicking chat
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );

  const JobListItem = ({ job }) => (
    <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => openJobModal(job)}>
      <div className="p-4 flex space-x-4">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{job.title}</h3>
              <div className="text-sm text-gray-600">{job.company}</div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="badge badge-primary capitalize flex items-center">
                <FiBriefcase className="w-3 h-3 mr-1" />
                {job.type?.replace('-', ' ')}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{job.description}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-gray-600 mb-2">
            <span className="flex items-center"><FiMapPin className="w-3 h-3 mr-1" />{job.location}</span>
            <span className="flex items-center"><FiClock className="w-3 h-3 mr-1" />{job.postedAgo}</span>
            <span className="flex items-center"><FiUser className="w-3 h-3 mr-1" />{job.applicants} applicants</span>
            <span className="flex items-center"><FiDollarSign className="w-3 h-3 mr-1" />{job.salary}</span>
            {job.tags?.length > 0 && (
              <span className="flex items-center gap-1">
                {job.tags.map((t) => (<span key={t} className="badge">{t}</span>))}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={job.recruiter?.avatar || '/placeholder/24/24'} alt={job.recruiter?.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm text-gray-700">{job.recruiter?.name}</span>
            </div>
            <ChatButton
              sellerId={job.recruiter?.id || job.recruiter_id || 'recruiter-guest'}
              sellerName={job.recruiter?.name || 'Recruiter'}
              sellerType="business"
              itemId={job.id}
              itemName={job.title}
              size="sm"
              variant="outline"
              // prevent opening modal when clicking chat
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Modal: Job details (frontend only; integrate with backend later)
  const JobDetailsModal = ({ job, isOpen, onClose }) => {
    if (!isOpen || !job) return null;

    // Compose details with graceful fallbacks
    const responsibilities = job.responsibilities || [
      'Collaborate with cross-functional teams to deliver features',
      'Write clean, maintainable, and testable code',
      'Participate in code reviews and team discussions',
    ];
    const requirements = job.requirements || [
      'Relevant coursework or experience',
      'Familiarity with required tools/technologies',
      'Strong problem-solving and communication skills',
    ];
    const benefits = job.benefits || [
      'Competitive compensation',
      'Flexible hours / remote options where applicable',
      'Opportunity to grow and learn',
    ];
    const howToApply = job.howToApply || 'Click the Chat button to contact the recruiter and share your resume/portfolio.';

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
              <div className="text-sm text-gray-600">{job.company}</div>
            </div>
            <button onClick={onClose} className="btn btn-outline">✕</button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-3">
              <span className="badge badge-primary capitalize flex items-center"><FiBriefcase className="w-3 h-3 mr-1" /> {job.type?.replace('-', ' ') || 'Job'}</span>
              <span className="badge flex items-center"><FiMapPin className="w-3 h-3 mr-1" /> {job.location || 'N/A'}</span>
              <span className="badge flex items-center"><FiClock className="w-3 h-3 mr-1" /> {job.postedAgo || 'Recently'}</span>
              <span className="badge flex items-center"><FiDollarSign className="w-3 h-3 mr-1" /> {job.salary || 'Negotiable'}</span>
            </div>

            {job.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.tags.map((t) => (<span key={t} className="badge">{t}</span>))}
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Job Description</h4>
              <p className="text-gray-700 text-sm leading-6">{job.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Responsibilities</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {responsibilities.map((r, i) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {requirements.map((r, i) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Benefits</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {benefits.map((b, i) => (<li key={i}>{b}</li>))}
              </ul>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border rounded-lg p-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">How to Apply</h4>
                <p className="text-sm text-gray-700">{howToApply}</p>
              </div>
              <ChatButton
                sellerId={job.recruiter?.id || job.recruiter_id || 'recruiter-guest'}
                sellerName={job.recruiter?.name || 'Recruiter'}
                sellerType="business"
                itemId={job.id}
                itemName={job.title}
                size="md"
                variant="filled"
              />
            </div>

            <div className="flex items-center space-x-3">
              <img src={job.recruiter?.avatar || '/placeholder/32/32'} alt={job.recruiter?.name} className="w-8 h-8 rounded-full" />
              <div>
                <div className="text-sm font-medium text-gray-800">{job.recruiter?.name || 'Recruiter'}</div>
                <div className="text-xs text-gray-500">{job.applicants || 0} applicants</div>
              </div>
              {job.recruiter?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jobs Board</h1>
              <p className="text-gray-600 mt-1">Find full-time, part-time, and freelance opportunities</p>
            </div>
            {/* Future: Post Job button for authorized roles */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search job titles, companies, skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary px-6">Search</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn btn-outline px-6 flex items-center">
              <FiFilter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </form>

          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Location</label>
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="form-input w-full">
                  <option value="all">All Locations</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chittagong">Chittagong</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div>
                <label className="form-label">Experience</label>
                <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value)} className="form-input w-full">
                  {experienceLevels.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Min Salary (৳)</label>
                <input type="number" placeholder="0" value={salaryRange.min} onChange={(e) => setSalaryRange(prev => ({ ...prev, min: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Max Salary (৳)</label>
                <input type="number" placeholder="No limit" value={salaryRange.max} onChange={(e) => setSalaryRange(prev => ({ ...prev, max: e.target.value }))} className="form-input w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-input w-full">
                  {sortOptions.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Job Type Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {jobTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                  selectedType === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                <span className="mr-2">{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode / Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">{loading ? 'Loading...' : `Found ${jobs.length} jobs`}</p>
          <div className="flex items-center space-x-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}><FiGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}><FiList className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton h-28 w-full"></div>
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-full"></div>
                  <div className="skeleton h-3 w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobListItem key={job.id} job={job} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FiTrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or browse all types</p>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal job={selectedJob} isOpen={showJobModal} onClose={closeJobModal} />
    </div>
  );
};

export default JobsBoard;
