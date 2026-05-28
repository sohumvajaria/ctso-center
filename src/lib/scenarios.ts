export interface Scenario {
  id: string;
  title: string;
  body: string;
  category: string;
  pi_list: { pi_number: number; description: string }[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'retail-sales-decline',
    title: 'Retail Store Sales Decline',
    category: 'Retail',
    body: 'You are the assistant manager at a mid-size retail clothing store. The store manager has asked you to present a plan to improve the store\'s declining sales performance over the past quarter. Sales are down 12% year-over-year. Address what factors may be causing the decline and outline specific strategies to turn performance around.',
    pi_list: [
      { pi_number: 1, description: 'Explain the concept of marketing strategies' },
      { pi_number: 2, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 3, description: 'Describe the role of customer service in business' },
      { pi_number: 4, description: 'Identify strategies to improve business performance' },
    ],
  },
  {
    id: 'hotel-guest-complaint',
    title: 'Hotel Guest Complaint Resolution',
    category: 'Hospitality',
    body: 'You are the front desk supervisor at a mid-scale hotel. A longtime loyalty member has complained that their room was not ready upon check-in, the Wi-Fi was down for six hours, and housekeeping skipped their room. The general manager wants you to explain how you handled the situation and what procedures you would put in place to prevent it from happening again.',
    pi_list: [
      { pi_number: 1, description: 'Describe the role of customer service in business' },
      { pi_number: 2, description: 'Explain the nature of effective communications' },
      { pi_number: 3, description: 'Identify strategies to improve business performance' },
      { pi_number: 4, description: 'Describe types of business risk' },
    ],
  },
  {
    id: 'small-business-loan',
    title: 'Small Business Financing Decision',
    category: 'Finance',
    body: 'You are a financial advisor at a local credit union. A small bakery owner wants to expand to a second location and is asking for guidance on financing options. She has good personal credit but limited business credit history and about $15,000 in savings. Walk her through the financing landscape and recommend the best path forward given her situation.',
    pi_list: [
      { pi_number: 1, description: 'Explain the role of finance in business' },
      { pi_number: 2, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 3, description: 'Describe sources of income' },
      { pi_number: 4, description: 'Explain the nature of business risk' },
    ],
  },
  {
    id: 'social-media-campaign',
    title: 'Social Media Marketing Campaign',
    category: 'Marketing',
    body: 'You are the marketing coordinator for a regional fitness gym chain. The owner wants to attract younger members (18–25) and has given you a $2,000 monthly budget for digital marketing. Engagement on the gym\'s existing social media channels is flat. Present a social media campaign strategy to grow brand awareness and drive new memberships in this demographic.',
    pi_list: [
      { pi_number: 1, description: 'Explain the concept of marketing strategies' },
      { pi_number: 2, description: 'Explain the role of promotion in the marketing mix' },
      { pi_number: 3, description: 'Identify the impact of technology on marketing' },
      { pi_number: 4, description: 'Explain factors that affect pricing decisions' },
    ],
  },
  {
    id: 'employee-turnover',
    title: 'High Employee Turnover',
    category: 'Human Resources',
    body: 'You are the HR manager at a fast-casual restaurant chain. The regional director has flagged that your location has a 70% annual employee turnover rate — well above the industry average of 45%. Labor costs are rising due to constant recruiting and training. Present your analysis of why turnover is high and your plan to improve retention.',
    pi_list: [
      { pi_number: 1, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 2, description: 'Identify strategies to improve business performance' },
      { pi_number: 3, description: 'Explain the nature of human resources management' },
      { pi_number: 4, description: 'Describe the role of ethics in business' },
    ],
  },
  {
    id: 'new-product-launch',
    title: 'New Product Launch Strategy',
    category: 'Marketing',
    body: 'You are a product manager at a consumer goods company launching a new line of eco-friendly cleaning products. Research shows strong consumer interest in sustainability, but the products are priced 20% above conventional alternatives. Present a go-to-market strategy including target market selection, distribution channels, and pricing justification.',
    pi_list: [
      { pi_number: 1, description: 'Explain the concept of marketing strategies' },
      { pi_number: 2, description: 'Explain factors that affect pricing decisions' },
      { pi_number: 3, description: 'Identify channels of distribution' },
      { pi_number: 4, description: 'Describe the nature of the marketing concept' },
    ],
  },
  {
    id: 'inventory-management',
    title: 'Inventory and Supply Chain Issues',
    category: 'Operations',
    body: 'You are the operations manager at an electronics retailer. During the recent holiday season, three of your top-selling products were out of stock for two weeks, costing the store an estimated $80,000 in lost sales. The owner wants to understand what went wrong in inventory planning and what system changes you will implement before next year\'s peak season.',
    pi_list: [
      { pi_number: 1, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 2, description: 'Describe the nature of business risk' },
      { pi_number: 3, description: 'Identify strategies to improve business performance' },
      { pi_number: 4, description: 'Explain the nature of operations management' },
    ],
  },
  {
    id: 'competitor-entry',
    title: 'Responding to a New Competitor',
    category: 'Strategy',
    body: 'You are the owner of an independent coffee shop that has been in business for eight years. A national coffee chain just opened a location two blocks away and is offering promotional pricing. Several of your regular customers have mentioned they tried the new place. Present your strategy for competing effectively and retaining your customer base without getting into a price war you cannot sustain.',
    pi_list: [
      { pi_number: 1, description: 'Explain the concept of marketing strategies' },
      { pi_number: 2, description: 'Describe the role of customer service in business' },
      { pi_number: 3, description: 'Explain factors that affect pricing decisions' },
      { pi_number: 4, description: 'Analyze the impact of competition on pricing decisions' },
    ],
  },
  {
    id: 'ethical-supplier-issue',
    title: 'Unethical Supplier Practices',
    category: 'Ethics',
    body: 'You are the purchasing manager at a mid-size apparel brand. A journalist has contacted your CEO claiming that one of your overseas suppliers uses substandard working conditions. The supplier provides 30% of your inventory at highly competitive prices. Your CEO asks you to assess the business and ethical implications and recommend a course of action.',
    pi_list: [
      { pi_number: 1, description: 'Describe the role of ethics in business' },
      { pi_number: 2, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 3, description: 'Explain the nature of business risk' },
      { pi_number: 4, description: 'Describe the relationship between ethics and social responsibility' },
    ],
  },
  {
    id: 'budget-planning',
    title: 'Annual Budget Planning',
    category: 'Finance',
    body: 'You are the store manager of a sporting goods retailer preparing the annual operating budget. Last year the store exceeded its revenue target by 5% but overran expenses by 9%, resulting in a net profit miss. The district manager wants you to walk through your budgeting approach for the coming year, explain how you will control costs, and identify where you see the best revenue growth opportunities.',
    pi_list: [
      { pi_number: 1, description: 'Explain the role of finance in business' },
      { pi_number: 2, description: 'Analyze factors affecting a business\'s profit' },
      { pi_number: 3, description: 'Explain the concept of marketing strategies' },
      { pi_number: 4, description: 'Identify strategies to improve business performance' },
    ],
  },
];

export function getRandomScenario(excludeId?: string): Scenario {
  const pool = excludeId ? SCENARIOS.filter((s) => s.id !== excludeId) : SCENARIOS;
  return pool[Math.floor(Math.random() * pool.length)];
}
