import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, FolderOpen, Calendar, Bell, Settings, Search, 
  Plus, MoreHorizontal, ChevronRight, ChevronDown, CheckCircle2, 
  CircleDashed, Clock, X, User, Activity, FileText, Check, 
  MessageSquare, Briefcase, Zap, GitCommit, Play, Target
} from 'lucide-react';

// --- Types & Interfaces ---
type Status = 'New' | 'Running' | 'Completed' | 'Lost' | 'Won' | 'Need Follow Up';

interface Opportunity {
  id: string;
  company: string;
  status: Status;
  engineer: string;
  meetingDate: string;
  lastUpdate: string;
  value?: string;
}

interface Meeting {
  id: string;
  date: string;
  title: string;
  participants: string[];
  agenda: string[];
  notes: string;
  actionItems: string[];
}

interface TimelineEvent {
  id: string;
  date: string;
  actor: string;
  action: string;
  description: string;
  icon: 'create' | 'update' | 'meeting' | 'system';
}

// --- Mock Data ---
const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: 'OPP-1042', company: 'Acme Corp', status: 'Running', engineer: 'Sarah Jenkins', meetingDate: 'Tomorrow, 2:00 PM', lastUpdate: '10 mins ago', value: '$120k' },
  { id: 'OPP-1041', company: 'Stark Industries', status: 'Need Follow Up', engineer: 'Mike Ross', meetingDate: 'Jul 28, 10:00 AM', lastUpdate: '2 hours ago', value: '$450k' },
  { id: 'OPP-1040', company: 'Wayne Enterprises', status: 'Completed', engineer: 'Sarah Jenkins', meetingDate: 'Jul 26, 4:00 PM', lastUpdate: '1 day ago', value: '$80k' },
  { id: 'OPP-1039', company: 'Globex Corp', status: 'New', engineer: 'Unassigned', meetingDate: 'Aug 1, 1:00 PM', lastUpdate: '2 days ago', value: 'TBD' },
  { id: 'OPP-1038', company: 'Initech', status: 'Won', engineer: 'David Chen', meetingDate: 'Jul 20, 11:00 AM', lastUpdate: '1 week ago', value: '$210k' },
  { id: 'OPP-1037', company: 'Umbrella Corp', status: 'Lost', engineer: 'Mike Ross', meetingDate: 'Jul 15, 9:00 AM', lastUpdate: '2 weeks ago', value: '$500k' },
];

const MOCK_TIMELINE: TimelineEvent[] = [
  { id: 't1', date: 'Jul 28, 09:41 AM', actor: 'System', action: 'KYC Report Completed', description: 'AI successfully generated Version 2 of the KYC report.', icon: 'system' },
  { id: 't2', date: 'Jul 27, 04:30 PM', actor: 'Sarah Jenkins', action: 'Meeting Notes Added', description: 'Uploaded agenda and preliminary notes for the upcoming discovery call.', icon: 'update' },
  { id: 't3', date: 'Jul 27, 02:15 PM', actor: 'Mike Ross', action: 'Engineer Assigned', description: 'Sarah Jenkins was assigned as the Lead Engineer.', icon: 'update' },
  { id: 't4', date: 'Jul 26, 11:00 AM', actor: 'System', action: 'Opportunity Created', description: 'Opportunity OPP-1042 was generated via CRM sync.', icon: 'create' },
];

const MOCK_MEETINGS: Meeting[] = [
  { id: 'm1', date: 'Jul 29, 2026 - 2:00 PM', title: 'Initial Discovery Call', participants: ['Sarah Jenkins (Magna)', 'John Doe (Acme)', 'Jane Smith (Acme)'], agenda: ['Introductions', 'Current Architecture Review', 'Pain points with current cloud provider'], notes: 'Client is heavily invested in AWS but looking for multi-cloud redundancy. Cost optimization is a major priority.', actionItems: ['Prepare cost-comparison matrix (Sarah)', 'Send follow-up architecture diagram (Mike)'] }
];

// --- Global Context for Routing & State ---
type PageRoute = 'dashboard' | 'opportunities' | 'opportunity-detail' | 'create-opportunity' | 'meetings' | 'notifications' | 'settings';

interface AppContextType {
  currentRoute: PageRoute;
  navigate: (route: PageRoute, params?: any) => void;
  routeParams: any;
  showToast: (message: string) => void;
}

const AppContext = createContext<AppContextType>({
  currentRoute: 'dashboard',
  navigate: () => {},
  routeParams: null,
  showToast: () => {},
});

// --- UI Primitives (Linear/Vercel Style) ---

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-zinc-200 shadow-sm rounded-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled }: any) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 shadow-sm",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-6 text-sm",
    icon: "h-9 w-9",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ status }: { status: Status }) => {
  const styles: Record<Status, string> = {
    'New': 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'Running': 'bg-orange-50 text-orange-700 ring-orange-600/20',
    'Completed': 'bg-green-50 text-green-700 ring-green-600/20',
    'Lost': 'bg-red-50 text-red-700 ring-red-600/20',
    'Won': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    'Need Follow Up': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {status}
    </span>
  );
};

const Input = ({ label, placeholder, type = 'text', required }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-sm font-medium text-zinc-700">{label} {required && <span className="text-red-500">*</span>}</label>}
    <input type={type} placeholder={placeholder} className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50" />
  </div>
);

const Textarea = ({ label, placeholder, rows = 3, required }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-sm font-medium text-zinc-700">{label} {required && <span className="text-red-500">*</span>}</label>}
    <textarea rows={rows} placeholder={placeholder} className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50" />
  </div>
);

// --- Layout Components ---

const Sidebar = () => {
  const { currentRoute, navigate } = useContext(AppContext);
  
  const navItems = [
    { name: 'Dashboard', route: 'dashboard', icon: LayoutDashboard },
    { name: 'Opportunities', route: 'opportunities', icon: FolderOpen },
    { name: 'Meetings', route: 'meetings', icon: Calendar },
    { name: 'Notifications', route: 'notifications', icon: Bell, badge: 3 },
    { name: 'Settings', route: 'settings', icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col h-screen shrink-0 sticky top-0">
      <div className="h-14 flex items-center px-6 border-b border-zinc-200">
        <div className="flex items-center gap-2 font-semibold text-zinc-900">
          <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center text-xs">M</div>
          MOIP
        </div>
      </div>
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentRoute === item.route || (currentRoute === 'opportunity-detail' && item.route === 'opportunities') || (currentRoute === 'create-opportunity' && item.route === 'opportunities');
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.route as PageRoute)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive ? 'bg-zinc-200/50 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`} />
                {item.name}
              </div>
              {item.badge && (
                <span className="bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-zinc-200">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
            <User className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">Alex Mercer</p>
            <p className="text-xs text-zinc-500 truncate">Lead Engineer</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TopNav = () => {
  return (
    <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center flex-1">
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search opportunities, companies, or KYC reports... (Cmd+K)"
            className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-zinc-500 hover:text-zinc-900 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
      </div>
    </header>
  );
};

// --- Page: Dashboard ---
const DashboardPage = () => {
  const { navigate } = useContext(AppContext);
  const metrics = [
    { label: 'Total Opportunities', value: '142', trend: '+12% from last month' },
    { label: 'Meetings Today', value: '4', trend: '2 preparation tasks pending' },
    { label: 'KYC Running', value: '3', trend: 'Average completion: 4m 12s' },
    { label: 'Need Follow Up', value: '18', trend: '5 high priority' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Good morning, Alex</h1>
        <p className="text-zinc-500 text-sm mt-1">Here is what's happening with your pipeline today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="p-5">
            <p className="text-sm font-medium text-zinc-500">{m.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-900">{m.value}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">{m.trend}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Recent Opportunities</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('opportunities')}>View All</Button>
            </div>
            <div className="divide-y divide-zinc-100">
              {MOCK_OPPORTUNITIES.slice(0, 4).map((opp) => (
                <div key={opp.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 cursor-pointer transition-colors" onClick={() => navigate('opportunity-detail', { id: opp.id })}>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{opp.company}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{opp.id} • {opp.engineer}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge status={opp.status} />
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-0">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Upcoming Meetings</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Jul</span>
                  <span className="text-sm font-bold text-zinc-900 leading-none">28</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Acme Corp Discovery</p>
                  <p className="text-xs text-zinc-500 mt-0.5">2:00 PM - 3:00 PM • Zoom</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Jul</span>
                  <span className="text-sm font-bold text-zinc-900 leading-none">29</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Wayne Ent. Architecture Sync</p>
                  <p className="text-xs text-zinc-500 mt-0.5">10:00 AM - 11:30 AM • Google Meet</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Page: Opportunity List ---
const OpportunityListPage = () => {
  const { navigate } = useContext(AppContext);
  
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Opportunities</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage and track your active sales pipeline.</p>
        </div>
        <Button onClick={() => navigate('create-opportunity')} className="gap-2">
          <Plus className="w-4 h-4" /> New Opportunity
        </Button>
      </div>

      <Card className="flex flex-col">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50/50">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input type="text" placeholder="Filter companies..." className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400" />
            </div>
            <Button variant="secondary" size="sm" className="gap-2"><Target className="w-4 h-4" /> Status</Button>
            <Button variant="secondary" size="sm" className="gap-2"><User className="w-4 h-4" /> Engineer</Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Value</th>
                <th className="px-6 py-3 font-medium">Engineer</th>
                <th className="px-6 py-3 font-medium">Next Meeting</th>
                <th className="px-6 py-3 font-medium">Last Update</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {MOCK_OPPORTUNITIES.map((opp) => (
                <tr key={opp.id} className="hover:bg-zinc-50/50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-600">
                        {opp.company.charAt(0)}
                      </div>
                      <div>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('opportunity-detail', { id: opp.id }); }} className="font-medium text-zinc-900 hover:underline">
                          {opp.company}
                        </a>
                        <div className="text-zinc-500 text-xs">{opp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge status={opp.status} /></td>
                  <td className="px-6 py-4 text-zinc-600 font-medium">{opp.value}</td>
                  <td className="px-6 py-4 text-zinc-600">{opp.engineer}</td>
                  <td className="px-6 py-4 text-zinc-600">{opp.meetingDate}</td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">{opp.lastUpdate}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-zinc-200 flex items-center justify-between text-sm text-zinc-500 bg-zinc-50/50">
          <div>Showing 1 to 6 of 142 results</div>
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" disabled>Previous</Button>
            <Button variant="secondary" size="sm">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Page: Create Opportunity Pipeline ---
const CreateOpportunityPage = () => {
  const { navigate, showToast } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineState, setPipelineState] = useState(0); // 0: Init, 1: Running, 2: KYC, 3: Done

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  
  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate AI pipeline
    setTimeout(() => setPipelineState(1), 500);
    setTimeout(() => setPipelineState(2), 2500);
    setTimeout(() => {
      setPipelineState(3);
      showToast('Opportunity Created & KYC Generated');
    }, 4500);
  };

  if (isSubmitting) {
    return (
      <div className="p-8 max-w-3xl mx-auto mt-12 animate-in fade-in duration-500">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white shadow-xl mb-6">
            <Zap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Processing Opportunity</h1>
          <p className="text-zinc-500">Magna AI is generating intelligence reports and setting up your workspace.</p>
        </div>

        <div className="space-y-6">
          {[
            { id: 1, title: 'Creating Opportunity Workspace', desc: 'Setting up database records and folders.', delay: 0 },
            { id: 2, title: 'Running AI KYC Analysis', desc: 'Scanning web sources and company history.', delay: 1 },
            { id: 3, title: 'Finalizing Preparation Checklist', desc: 'Generating recommended questions and use cases.', delay: 2 }
          ].map((item, idx) => {
            const isActive = pipelineState === item.delay;
            const isDone = pipelineState > item.delay;
            
            return (
              <Card key={item.id} className={`p-5 transition-all duration-500 ${isActive ? 'ring-2 ring-zinc-900 shadow-md' : 'border-zinc-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : isActive ? (
                      <CircleDashed className="w-6 h-6 text-zinc-900 animate-spin" />
                    ) : (
                      <CircleDashed className="w-6 h-6 text-zinc-300" />
                    )}
                  </div>
                  <div className={isDone ? 'opacity-70' : isActive ? 'opacity-100' : 'opacity-40'}>
                    <h3 className="font-medium text-zinc-900">{item.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {pipelineState === 3 && (
          <div className="mt-10 flex justify-center animate-in slide-in-from-bottom-4 fade-in">
            <Button size="lg" onClick={() => navigate('opportunity-detail', { id: 'NEW' })}>
              View Opportunity
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <button onClick={() => navigate('opportunities')} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to List
        </button>
        <h1 className="text-2xl font-semibold text-zinc-900">New Opportunity</h1>
        <p className="text-zinc-500 text-sm mt-1">Enter details to initiate the AI intelligence process.</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step === i ? 'bg-zinc-900 text-white' : step > i ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
              {step > i ? <Check className="w-4 h-4" /> : i}
            </div>
            {i < 3 && <div className={`flex-1 h-px ${step > i ? 'bg-green-200' : 'bg-zinc-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">Company Information</h2>
            <div className="space-y-4">
              <Input label="Company Name" placeholder="e.g. Acme Corp" required />
              <Input label="Website URL" placeholder="e.g. https://acme.com" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Primary Contact" placeholder="John Doe" />
                <Input label="Email" placeholder="john@acme.com" type="email" />
              </div>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">Meeting & Assignment</h2>
            <div className="space-y-4">
              <Input label="Initial Meeting Date" type="datetime-local" />
              <div className="space-y-1.5 w-full">
                <label className="block text-sm font-medium text-zinc-700">Target Product Line</label>
                <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-zinc-900">
                  <option>Cloud Infrastructure</option>
                  <option>Cybersecurity Suite</option>
                  <option>Data Analytics Platform</option>
                </select>
              </div>
              <Input label="Assign Lead Engineer" placeholder="Search team members..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">Context & Needs</h2>
            <div className="space-y-4">
              <Textarea label="Known Customer Needs / Pain Points" required placeholder="Describe what the customer is trying to solve..." rows={5} />
              <Textarea label="Additional Context for AI" placeholder="Any specific areas the KYC report should focus on?" rows={3} />
            </div>
            <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-md flex gap-3">
              <Activity className="w-5 h-5 shrink-0" />
              <p>Upon submission, Magna AI will automatically scan public records and generate a comprehensive KYC report based on these needs.</p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1}>Back</Button>
          {step < 3 ? (
            <Button onClick={handleNext}>Continue Step {step + 1}</Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2">
              <Zap className="w-4 h-4" /> Run AI Intelligence
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};


// --- Page: Opportunity Detail (The Complex One) ---

const KYCReportTab = () => {
  const [openAccordion, setOpenAccordion] = useState<string | null>('uc1');
  
  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Executive Summary */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Executive Summary</h3>
        <Card className="p-6 bg-zinc-900 text-zinc-50 border-none shadow-md">
          <div className="flex gap-4 items-start">
            <Zap className="w-6 h-6 text-zinc-400 shrink-0 mt-1" />
            <div className="space-y-4">
              <p className="leading-relaxed">
                Acme Corp is undergoing a massive digital transformation, aiming to migrate 80% of their legacy on-premise infrastructure to a multi-cloud environment within 18 months. Their primary bottleneck is legacy data silos and compliance risks.
              </p>
              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-400">Estimated Value</div>
                  <div className="font-medium mt-1">$120k - $200k ARR</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Closing Probability</div>
                  <div className="font-medium mt-1 text-green-400">High (75%)</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* AI Use Cases (Accordion) */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Recommended Solutions & Use Cases</h3>
        <div className="space-y-3">
          {[
            { id: 'uc1', title: 'Automated Document Intelligence', impact: 'High', desc: 'Utilize AI to extract and structure data from their legacy unstructured PDFs and contracts, feeding directly into the new cloud DB.', products: ['Magna DocAI', 'GCP Document AI'] },
            { id: 'uc2', title: 'Predictive Infrastructure Scaling', impact: 'Medium', desc: 'Implement machine learning models to predict peak server loads based on historical e-commerce data.', products: ['Magna CloudOps', 'Google Kubernetes Engine'] },
          ].map((uc) => {
            const isOpen = openAccordion === uc.id;
            return (
              <Card key={uc.id} className="overflow-hidden transition-all duration-200">
                <button 
                  onClick={() => toggleAccordion(uc.id)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-zinc-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-md ${isOpen ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-zinc-900">{uc.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-1 bg-white">Impact: {uc.impact}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 py-5 border-t border-zinc-100 bg-zinc-50/50 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-sm text-zinc-600 leading-relaxed">{uc.desc}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">Relevant Solutions</h4>
                      <div className="flex flex-wrap gap-2">
                        {uc.products.map(p => (
                          <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-200 text-zinc-800">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Preparation Checklist */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Meeting Preparation</h3>
        <Card className="p-0">
          <ul className="divide-y divide-zinc-100">
            {[
              "Review the competitor analysis (AWS vs GCP) provided in Appendix B.",
              "Prepare a demo of Magna DocAI processing a legacy contract.",
              "Ask about their specific compliance requirements for EU data residency."
            ].map((item, idx) => (
              <li key={idx} className="p-4 flex gap-3 hover:bg-zinc-50">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                <span className="text-sm text-zinc-700">{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
};

const TimelineTab = () => (
  <div className="py-4 pl-4 pr-2">
    <div className="relative border-l border-zinc-200 space-y-8 pb-4">
      {MOCK_TIMELINE.map((event, idx) => (
        <div key={event.id} className="relative pl-8">
          <div className="absolute -left-[17px] top-1 w-8 h-8 bg-white rounded-full border border-zinc-200 flex items-center justify-center shadow-sm">
            {event.icon === 'system' && <Zap className="w-4 h-4 text-zinc-500" />}
            {event.icon === 'update' && <GitCommit className="w-4 h-4 text-zinc-500" />}
            {event.icon === 'create' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-zinc-900">{event.actor}</span>
              <span className="text-zinc-400 text-sm">•</span>
              <span className="text-zinc-500 text-xs">{event.date}</span>
            </div>
            <p className="text-sm text-zinc-900 font-medium mb-1">{event.action}</p>
            <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 p-3 rounded-md mt-2 inline-block shadow-sm">
              {event.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OpportunityDetailPage = () => {
  const { navigate } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('kyc');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'timeline', label: 'Timeline', icon: GitCommit },
    { id: 'kyc', label: 'KYC Report', icon: FileText },
    { id: 'versions', label: 'Versions', icon: Clock },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header Area */}
      <div className="bg-white border-b border-zinc-200 px-8 pt-8 pb-0">
        <div className="max-w-[1200px] mx-auto">
          <button onClick={() => navigate('opportunities')} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4">
            <ChevronRight className="w-4 h-4 rotate-180" /> Opportunities
          </button>
          
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Acme Corp Cloud Migration</h1>
                <Badge status="Running" />
              </div>
              <p className="text-zinc-500">OPP-1042 • Owned by Sarah Jenkins • Created Jul 26, 2026</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="gap-2"><Share className="w-4 h-4" /> Share</Button>
              <Button variant="secondary"><MoreHorizontal className="w-4 h-4" /></Button>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Log Meeting</Button>
            </div>
          </div>

          {/* Custom Tabs Navigation */}
          <div className="flex gap-6 border-b border-zinc-200 translate-y-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-zinc-900 text-zinc-900' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto">
          {activeTab === 'kyc' && <KYCReportTab />}
          {activeTab === 'timeline' && <TimelineTab />}
          
          {/* Placeholder for other tabs to save space in single file */}
          {(activeTab === 'overview' || activeTab === 'meetings' || activeTab === 'versions') && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500 animate-in fade-in">
              <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
              <p>Content for {tabs.find(t => t.id === activeTab)?.label} is available in full production build.</p>
              <Button variant="secondary" className="mt-4" onClick={() => setActiveTab('kyc')}>Switch to KYC Report</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper for icon in placeholder above
const Share = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
)


// --- Main Application Bootstrapper ---
export default function MOIPApp() {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>('dashboard');
  const [routeParams, setRouteParams] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigate = (route: PageRoute, params: any = null) => {
    setCurrentRoute(route);
    setRouteParams(params);
    window.scrollTo(0, 0);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Theming & Fonts applied globally via tailwind CDN in real usage. 
  // Here we use standard tailwind classes on a wrapper.
  return (
    <AppContext.Provider value={{ currentRoute, navigate, routeParams, showToast }}>
      <div className="flex h-screen w-full bg-zinc-100 text-zinc-900 font-sans selection:bg-zinc-200">
        
        <Sidebar />
        
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">
          <TopNav />
          
          <main className="flex-1 overflow-y-auto relative bg-zinc-50">
            {currentRoute === 'dashboard' && <DashboardPage />}
            {currentRoute === 'opportunities' && <OpportunityListPage />}
            {currentRoute === 'create-opportunity' && <CreateOpportunityPage />}
            {currentRoute === 'opportunity-detail' && <OpportunityDetailPage />}
            
            {/* Fallback for unbuilt pages */}
            {['meetings', 'notifications', 'settings'].includes(currentRoute) && (
              <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center mt-20 text-center animate-in fade-in">
                <Target className="w-16 h-16 text-zinc-200 mb-6" />
                <h2 className="text-xl font-medium text-zinc-900 mb-2">Page Under Construction</h2>
                <p className="text-zinc-500 max-w-md">The {currentRoute} module is planned for Phase 2 of the MOIP rollout.</p>
                <Button onClick={() => navigate('dashboard')} className="mt-6">Return to Dashboard</Button>
              </div>
            )}
          </main>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-zinc-900 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-4 text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}