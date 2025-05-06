import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Send, Loader2, ArrowLeft, Star, ExternalLink, ThumbsUp, ThumbsDown, Check, X, DollarSign, Users, Code, Zap, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { findTools } from './services/tool-finder';
import ParticlesBackground from './background';
import SearchInput from './components/SearchInput';

interface ToolPricingTier {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}

interface ToolReview {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface Tool {
  name: string;
  tagline?: string;
  description: string;
  url: string;
  category?: string;
  subcategory?: string;
  categories?: string[];
  upvotes?: number;
  features?: string[];
  useCases?: string[];
  pricing?: ToolPricingTier[];
  reviews?: ToolReview[];
  screenshots?: string[];
  demoVideo?: string;
  alternatives?: {name: string, url: string}[];
  pros?: string[];
  cons?: string[];
  lastUpdated?: string;
  source?: string;
  badges?: string[];
  videoEmbed?: string;
  rating?: number;
  imageUrl?: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResultReady, setIsResultReady] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot'; content: string }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [foundTool, setFoundTool] = useState<Tool | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('features');
  const [previousSection, setPreviousSection] = useState<string | null>('features');
  const [tabDirection, setTabDirection] = useState<number>(0);
  const [activeScreenshot, setActiveScreenshot] = useState<number>(0);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  
  const resetSearch = () => {
    setIsResultReady(false);
    setMessages([]);
    setCurrentMessage('');
    setFoundTool(null);
    setExpandedSection('features');
  };

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      return; // Don't do anything if clicking the same tab
    }
    
    // Determine the direction for animation
    const sections = ['features', 'useCases', 'pricing', 'reviews', 'prosCons', 'alternatives'];
    const currentIndex = sections.indexOf(expandedSection || 'features');
    const newIndex = sections.indexOf(section);
    setTabDirection(newIndex > currentIndex ? 1 : -1);
    
    setPreviousSection(expandedSection);
    setExpandedSection(section);
  };

  const searchAITool = async (searchQuery: string) => {
    if (!searchQuery) return;
    
    setQuery(searchQuery);
    setIsProcessing(true);
    setMessages([{ type: 'bot', content: `Searching for tools related to "${searchQuery}"...` }]);
    
    try {
      console.log(`Starting search for: ${searchQuery}`);
      const tools = await findTools(searchQuery);
      console.log(`Search complete. Found ${tools.length} tools`);
      
      if (tools && tools.length > 0) {
        // Convert the first tool to our app's Tool format
        const bestTool = tools[0];
        console.log(`Best matching tool: ${bestTool.name}`);
        
        // Extract categories from the tool if available
        const categories = Array.isArray(bestTool.categories) 
          ? bestTool.categories 
          : (bestTool.categories ? [bestTool.categories] : []);
          
        // Create features from description if not available
        const features = bestTool.badges || 
          (bestTool.description ? bestTool.description.split('. ')
            .filter(s => s.length > 10 && !s.toLowerCase().includes(bestTool.name.toLowerCase()))
            .slice(0, 5) : []);
            
        // Extract pros and cons if available or create basic ones
        const pros = bestTool.pros || [
          "Easy to use interface",
          "Specialized for " + searchQuery,
          "Regular updates and improvements"
        ];
        
        const cons = bestTool.cons || [
          "May require subscription for advanced features"
        ];
        
        // Convert screenshots - use imageUrl if available
        const screenshots = bestTool.screenshots || [];
        if (bestTool.imageUrl && !screenshots.includes(bestTool.imageUrl)) {
          screenshots.unshift(bestTool.imageUrl);
        }

        // Format the videoEmbed URL if it exists
        let videoEmbed = bestTool.videoEmbed;
        if (videoEmbed) {
          // Ensure YouTube embeds use the embed URL format
          if (videoEmbed.includes('youtube.com/watch?v=')) {
            const videoId = videoEmbed.split('v=')[1]?.split('&')[0];
            if (videoId) {
              videoEmbed = `https://www.youtube.com/embed/${videoId}`;
            }
          }
          // Ensure Vimeo embeds use the proper format
          else if (videoEmbed.includes('vimeo.com/') && !videoEmbed.includes('/embed')) {
            const vimeoId = videoEmbed.split('vimeo.com/')[1]?.split('?')[0];
            if (vimeoId) {
              videoEmbed = `https://player.vimeo.com/video/${vimeoId}`;
            }
          }
        }
        
        const convertedTool: Tool = {
          name: bestTool.name,
          tagline: bestTool.tagline || `AI tool for ${searchQuery}`,
          description: bestTool.description,
          url: bestTool.url,
          category: categories[0] || searchQuery,
          subcategory: categories[1],
          categories: categories,
          features: features,
          upvotes: bestTool.upvotes || Math.floor(Math.random() * 500) + 50,
          useCases: bestTool.useCases || [
            `Perfect for ${searchQuery} tasks`,
            "Streamlines workflows",
            "Helps save time and resources"
          ],
          pricing: bestTool.pricing ? [{
            name: "Starting from",
            price: typeof bestTool.pricing === 'string' ? bestTool.pricing : "Free trial available",
            features: ["Basic features", "Customer support", "Regular updates"]
          }] : undefined,
          screenshots: screenshots,
          imageUrl: bestTool.imageUrl,
          demoVideo: videoEmbed,
          videoEmbed: videoEmbed,
          pros: pros,
          cons: cons,
          lastUpdated: bestTool.lastUpdated || new Date().toLocaleDateString(),
          source: bestTool.source,
          badges: bestTool.badges || ["AI-Powered", searchQuery],
          rating: bestTool.rating || (Math.floor(Math.random() * 15) + 35) / 10
        };

        setFoundTool(convertedTool);
        setIsResultReady(true);
        
        // Generate a helpful message mentioning alternative tools if available
        let message = `Based on your search for "${searchQuery}", I've found ${tools.length > 1 ? 'several tools! The best match is' : 'a perfect tool for you:'} ${bestTool.name}.`;
        
        if (tools.length > 1) {
          message += ` I've also found ${tools.length - 1} other tool${tools.length > 2 ? 's' : ''} that might interest you, including ${tools[1].name}${tools.length > 2 ? ` and ${tools[2].name}` : ''}.`;
        }
        
        message += ` Would you like to know more about ${bestTool.name}'s features?`;
        
        setMessages([{ type: 'bot', content: message }]);
      } else {
        console.log('No tools found for query');
        setMessages([{ 
          type: 'bot', 
          content: `I couldn't find any tools matching "${searchQuery}". Please try a different search term or be more specific about what you're looking for.` 
        }]);
      }
      
    } catch (error) {
      console.error('Error searching AI tools:', error);
      setMessages([{ 
        type: 'bot', 
        content: 'Sorry, I encountered an error while searching for tools. Please try a different query or try again later.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    const userMessage = currentMessage;
    setCurrentMessage('');
    
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    
    // Simulate bot typing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate bot response about the found tool
    if (foundTool) {
      if (userMessage.toLowerCase().includes('features') || userMessage.toLowerCase().includes('what')) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: `${foundTool.name} offers powerful features for data visualization and analysis. It uses AI to help developers quickly build dashboards and reports with minimal code. It integrates with popular data sources and can be deployed in minutes.` 
        }]);
      } else if (userMessage.toLowerCase().includes('price') || userMessage.toLowerCase().includes('cost')) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: `${foundTool.name} has a free tier for individuals and a premium tier starting at $29/month for teams with advanced features. Check their website for current pricing details.` 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: `${foundTool.name} is a great choice for your needs. You can visit their website at ${foundTool.url} to learn more and get started. Is there anything specific about this tool you'd like to know?` 
        }]);
      }
    }
  };

  // Function to handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    if (foundTool?.screenshots) {
      setActiveScreenshot(index);
    }
  };

  // Function to navigate screenshots
  const navigateScreenshots = (direction: 'prev' | 'next') => {
    if (!foundTool?.screenshots) return;
    
    if (direction === 'prev') {
      setActiveScreenshot(prev => (prev > 0 ? prev - 1 : foundTool.screenshots!.length - 1));
    } else {
      setActiveScreenshot(prev => (prev < foundTool.screenshots!.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <ParticlesBackground 
          showContent={false} 
          particleCount={1500} 
          className="h-full w-full"
          key="particles-background"
        />
      </div>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait" custom={isResultReady}>
          {!isResultReady ? (
            <motion.div 
              key="search-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-4xl backdrop-blur-xl bg-black/40 rounded-2xl shadow-2xl overflow-hidden mb-4 border border-white/10"
            >
              <div className="p-8">
                <SearchInput onSearch={searchAITool} isProcessing={isProcessing} />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 330, 
                damping: 24,
                mass: 0.8 
              }}
              className="w-full h-full p-4 md:p-6 flex flex-col"
            >
              {foundTool && (
                <div className="flex flex-col h-full">
                  {/* Header with back button */}
                  <motion.div 
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: 0.1
                    }}
                    className="flex items-center mb-4"
                  >
                    <motion.button
                      whileHover={{ 
                        scale: 1.08,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      }}
                      whileTap={{ scale: 0.92 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15
                      }}
                      onClick={resetSearch}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200 bg-black/40 backdrop-blur-md border border-white/10"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </motion.button>
                    <h2 className="text-lg font-semibold text-white ml-3">Perfect AI Tool for: {query}</h2>
                  </motion.div>

                  {/* Main content area - split layout */}
                  <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-130px)]">
                    {/* Tool info section - 3/4 width on large screens */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 lg:w-3/4 overflow-auto backdrop-blur-xl bg-black/40 rounded-2xl border border-white/10 shadow-2xl"
                    >
                      <div className="p-6">
                        {/* Tool header with name, upvote count, and external link */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                          <div>
                            <h1 className="text-3xl font-bold text-white mb-1">{foundTool.name}</h1>
                            <p className="text-xl text-gray-300 mb-2">{foundTool.tagline}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                                {foundTool.category}
                              </span>
                              {foundTool.subcategory && (
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                                  {foundTool.subcategory}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <ThumbsUp className="w-4 h-4 text-gray-300" />
                              <span className="text-white font-semibold">{foundTool.upvotes}</span>
                            </div>
                            <a 
                              href={foundTool.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors duration-200 border border-white/10 flex items-center gap-2"
                            >
                              <span>Visit Website</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Tool description */}
                        <div className="mb-8">
                          <p className="text-gray-200 leading-relaxed">{foundTool.description}</p>
                        </div>

                        {/* Demo Video Section */}
                        {foundTool.videoEmbed && (
                          <div className="mb-8">
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                              <div className="p-1.5 bg-white/10 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </div>
                              <span>Demo Video</span>
                            </h3>
                            <div className="relative overflow-hidden rounded-xl border border-white/10">
                              <div className="aspect-video w-full">
                                <iframe 
                                  src={foundTool.videoEmbed}
                                  className="w-full h-full rounded-xl"
                                  title={`${foundTool.name} demo video`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              </div>
                            </div>
                          </div>
                        )}
                          
                        {/* Screenshots Gallery Section */}
                        {foundTool.screenshots && foundTool.screenshots.length > 0 && (
                          <div className="mb-8">
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                              <div className="p-1.5 bg-white/10 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                  <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                              </div>
                              <span>Product Screenshots</span>
                            </h3>

                            {/* Main Screenshot */}
                            <div className="relative mb-4 group">
                              <div className="relative overflow-hidden rounded-xl border border-white/10">
                                <img 
                                  src={foundTool.screenshots[activeScreenshot]} 
                                  alt={`${foundTool.name} screenshot ${activeScreenshot + 1}`}
                                  className="w-full aspect-video object-cover rounded-xl transition-transform duration-500 hover:scale-105"
                                  onClick={() => setShowGalleryModal(true)}
                                />
                              </div>
                            </div>

                            {/* Thumbnails */}
                            {foundTool.screenshots.length > 1 && (
                              <div className="relative">
                                <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-2 px-1">
                                  {foundTool.screenshots.map((screenshot, index) => (
                                    <div 
                                      key={index}
                                      className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                                        activeScreenshot === index ? 'border-white shadow-glow' : 'border-white/10 hover:border-white/50'
                                      }`}
                                      style={{ width: '180px', height: '100px' }}
                                      onClick={() => handleThumbnailClick(index)}
                                    >
                                      <img 
                                        src={screenshot} 
                                        alt={`${foundTool.name} thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className={`absolute inset-0 bg-black/30 flex items-center justify-center ${
                                        activeScreenshot === index ? 'opacity-0' : 'opacity-40'
                                      }`}></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tabs Navigation */}
                        <div className="mb-6">
                          <div className="flex overflow-x-auto hide-scrollbar border-b border-white/10 mb-6">
                            {['features', 'useCases', 'pricing', 'reviews', 'prosCons', 'alternatives'].map((section) => {
                              // Convert section name to display name
                              const displayNames: {[key: string]: string} = {
                                features: 'Features',
                                useCases: 'Use Cases',
                                pricing: 'Pricing',
                                reviews: 'Reviews',
                                prosCons: 'Pros & Cons',
                                alternatives: 'Alternatives'
                              };
                              
                              // Get icon component based on section
                              const getIcon = (section: string) => {
                                switch(section) {
                                  case 'features': return <Zap className="w-4 h-4" />;
                                  case 'useCases': return <Users className="w-4 h-4" />;
                                  case 'pricing': return <DollarSign className="w-4 h-4" />;
                                  case 'reviews': return <Star className="w-4 h-4" />;
                                  case 'prosCons': return <ThumbsUp className="w-4 h-4" />;
                                  case 'alternatives': return <Code className="w-4 h-4" />;
                                  default: return null;
                                }
                              };
                              
                              return (
                                <motion.button
                                  key={section}
                                  whileHover={{ y: -2 }}
                                  whileTap={{ y: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 17
                                  }}
                                  onClick={() => toggleSection(section)}
                                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all duration-300 border-b-2 ${
                                    expandedSection === section 
                                      ? 'text-white border-white' 
                                      : 'text-gray-400 border-transparent hover:text-gray-200'
                                  }`}
                                >
                                  <motion.div 
                                    animate={expandedSection === section ? { scale: 1.1 } : { scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                  >
                                    {getIcon(section)}
                                  </motion.div>
                                  <span>{displayNames[section]}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dynamic Content Based on Selected Tab */}
                        <div className="relative min-h-[300px] overflow-hidden">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                              key={expandedSection}
                              initial={{ 
                                opacity: 0, 
                                x: tabDirection * 15,
                                filter: "blur(4px)",
                                position: previousSection ? 'absolute' : 'relative'
                              }}
                              animate={{ 
                                opacity: 1,
                                x: 0,
                                filter: "blur(0px)",
                                position: 'relative'
                              }}
                              exit={{ 
                                opacity: 0, 
                                x: tabDirection * -15,
                                filter: "blur(4px)",
                                position: 'absolute',
                                width: '100%',
                              }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 270, 
                                damping: 25,
                                mass: 0.75
                              }}
                              className="w-full"
                            >
                              {/* Features Content */}
                              {expandedSection === 'features' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {foundTool.features?.map((feature, index) => (
                                    <motion.div
                                      key={index}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ 
                                        opacity: 1, 
                                        y: 0,
                                        transition: { delay: index * 0.1 }
                                      }}
                                      className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="bg-white/10 p-2 rounded-lg">
                                          <Check className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                          <h4 className="text-white font-medium">Feature {index + 1}</h4>
                                          <p className="text-gray-300 mt-1">{feature}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}

                              {/* Use Cases Content */}
                              {expandedSection === 'useCases' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {foundTool.useCases?.map((useCase, index) => (
                                    <motion.div
                                      key={index}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: 1,
                                        transition: { delay: index * 0.1 }
                                      }}
                                      className="flex flex-col items-center text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
                                    >
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/20 flex items-center justify-center mb-3">
                                        <span className="text-white font-bold">{index + 1}</span>
                                      </div>
                                      <p className="text-gray-200">{useCase}</p>
                                    </motion.div>
                                  ))}
                                </div>
                              )}

                              {/* Pricing Content */}
                              {expandedSection === 'pricing' && (
                                <div>
                                  {foundTool?.pricing && foundTool.pricing.length > 0 ? (
                                    <>
                                      <div className={`grid gap-6 ${
                                        // Dynamically adjust grid columns based on number of pricing tiers
                                        foundTool.pricing.length === 1 ? 'grid-cols-1' :
                                        foundTool.pricing.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                        foundTool.pricing.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                                        foundTool.pricing.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
                                        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                      }`}>
                                        {foundTool.pricing.map((tier, index) => (
                                          <motion.div 
                                            key={index} 
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ 
                                              opacity: 1, 
                                              y: 0,
                                              transition: { delay: index * 0.15 }
                                            }}
                                            whileHover={{ y: -5 }}
                                            className={`p-6 rounded-xl border relative ${
                                              tier.popular 
                                                ? 'border-white/30 bg-gradient-to-br from-white/10 to-white/5 shadow-lg' 
                                                : 'border-white/10 bg-black/30'
                                            }`}
                                          >
                                            {tier.popular && (
                                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full">
                                                <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                                                  Most Popular
                                                </span>
                                              </div>
                                            )}
                                            <div className="text-center mb-4 mt-2">
                                              <h4 className="text-xl font-bold text-white mb-1">{tier.name}</h4>
                                              <p className="text-3xl font-bold text-white mb-1">{tier.price}</p>
                                              {tier.price !== "Custom" && (
                                                <p className="text-gray-400 text-sm">per month, billed annually</p>
                                              )}
                                            </div>
                                            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-4"></div>
                                            <ul className="space-y-3">
                                              {tier.features.map((feature, featureIndex) => (
                                                <li key={featureIndex} className="flex items-start gap-2">
                                                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                                  <span className="text-gray-200 text-sm">{feature}</span>
                                                </li>
                                              ))}
                                            </ul>
                                            <button className={`w-full mt-6 py-2 rounded-lg ${
                                              tier.popular 
                                                ? 'bg-white text-black font-medium hover:bg-white/90'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                            } transition-colors duration-200`}>
                                              {tier.price === "Custom" ? "Contact Sales" : "Choose Plan"}
                                            </button>
                                          </motion.div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    // Handle case where there are no pricing tiers
                                    <div className="flex flex-col items-center justify-center p-8 text-center bg-black/30 rounded-xl border border-white/10">
                                      <div className="bg-white/10 p-4 rounded-full mb-4">
                                        <DollarSign className="w-8 h-8 text-gray-300" />
                                      </div>
                                      <h3 className="text-xl font-semibold text-white mb-2">No Pricing Information Available</h3>
                                      <p className="text-gray-300">Pricing details for this tool haven't been provided or are available only upon request.</p>
                                      <button className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-colors duration-200">
                                        Contact for Pricing
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Reviews Content */}
                              {expandedSection === 'reviews' && (
                                <div>
                                  <div className="mb-6 bg-gradient-to-r from-white/5 to-transparent p-4 rounded-xl">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-white">
                                        4.7
                                      </div>
                                      <div>
                                        <div className="flex mb-1">
                                          {[...Array(5)].map((_, i) => (
                                            <Star 
                                              key={i} 
                                              className={`w-5 h-5 ${
                                                i < 4 
                                                  ? 'text-yellow-400 fill-yellow-400' 
                                                  : i === 4 ? 'text-yellow-400 fill-yellow-400 opacity-70' : 'text-gray-600'
                                              }`} 
                                            />
                                          ))}
                                        </div>
                                        <p className="text-gray-300">Based on {foundTool.reviews?.length} reviews</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    {foundTool.reviews?.map((review, index) => (
                                      <motion.div 
                                        key={index} 
                                        initial={{ opacity: 0 }}
                                        animate={{ 
                                          opacity: 1,
                                          transition: { delay: index * 0.1 }
                                        }}
                                        className="p-5 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 transition-colors duration-300"
                                      >
                                        <div className="flex justify-between mb-2">
                                          <div className="font-semibold text-white">{review.author}</div>
                                          <div className="text-sm text-gray-400">{review.date}</div>
                                        </div>
                                        <div className="flex mb-2">
                                          {[...Array(5)].map((_, i) => (
                                            <Star 
                                              key={i} 
                                              className={`w-4 h-4 ${
                                                i < review.rating 
                                                  ? 'text-yellow-400 fill-yellow-400' 
                                                  : 'text-gray-600'
                                              }`} 
                                            />
                                          ))}
                                        </div>
                                        <p className="text-gray-300">{review.comment}</p>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Pros & Cons Content */}
                              {expandedSection === 'prosCons' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-gradient-to-br from-emerald-900/20 to-emerald-600/10 backdrop-blur-sm p-5 rounded-xl border border-emerald-500/20"
                                  >
                                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                                        <ThumbsUp className="w-4 h-4 text-emerald-400" />
                                      </div>
                                      <span>Pros</span>
                                    </h4>
                                    <ul className="space-y-3">
                                      {foundTool.pros?.map((pro, index) => (
                                        <motion.li 
                                          key={index} 
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ 
                                            opacity: 1, 
                                            x: 0,
                                            transition: { delay: 0.1 + index * 0.1 }
                                          }}
                                          className="flex items-start gap-2 bg-emerald-900/10 p-3 rounded-lg"
                                        >
                                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                          <span className="text-gray-200">{pro}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-gradient-to-br from-rose-900/20 to-rose-600/10 backdrop-blur-sm p-5 rounded-xl border border-rose-500/20"
                                  >
                                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                      <div className="p-2 bg-rose-500/20 rounded-lg">
                                        <ThumbsDown className="w-4 h-4 text-rose-400" />
                                      </div>
                                      <span>Cons</span>
                                    </h4>
                                    <ul className="space-y-3">
                                      {foundTool.cons?.map((con, index) => (
                                        <motion.li 
                                          key={index}
                                          initial={{ opacity: 0, x: 10 }}
                                          animate={{ 
                                            opacity: 1, 
                                            x: 0,
                                            transition: { delay: 0.1 + index * 0.1 }
                                          }}
                                          className="flex items-start gap-2 bg-rose-900/10 p-3 rounded-lg"
                                        >
                                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                          <span className="text-gray-200">{con}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                </div>
                              )}

                              {/* Alternatives Content */}
                              {expandedSection === 'alternatives' && (
                                <div>
                                  <p className="text-gray-300 mb-4">Here are some alternatives to {foundTool.name} you might want to consider:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {foundTool.alternatives?.map((alt, index) => (
                                      <motion.a 
                                        key={index}
                                        href={alt.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ 
                                          opacity: 1, 
                                          scale: 1,
                                          transition: { delay: index * 0.1 }
                                        }}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        className="p-5 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10 transition-all duration-300 shadow-sm hover:shadow-lg hover:border-white/20 flex flex-col items-center text-center"
                                      >
                                        <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-3">
                                          <Code className="w-6 h-6 text-white" />
                                        </div>
                                        <h5 className="text-white font-semibold text-lg mb-1">{alt.name}</h5>
                                        <p className="text-gray-400 text-sm mb-3">Alternative solution</p>
                                        <div className="flex items-center text-blue-400 text-sm">
                                          <span>Visit website</span>
                                          <ExternalLink className="w-3 h-3 ml-1" />
                                        </div>
                                      </motion.a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Last updated info */}
                        <div className="text-sm text-gray-400 mt-8">
                          Last updated: {foundTool.lastUpdated}
                        </div>
                      </div>
                    </motion.div>

                    {/* Chat section on right side - 1/4 width on large screens */}
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="lg:w-1/4 h-full flex flex-col backdrop-blur-xl bg-black/30 rounded-2xl border border-white/10 shadow-lg overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/10 bg-black/40">
                        <h3 className="text-lg font-semibold text-white">Ask AI Assistant</h3>
                      </div>
                      
                      <div className="flex-1 overflow-auto p-3 space-y-4">
                        {messages.map((message, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.type === 'bot' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/5 shrink-0"
                              >
                                <span role="img" aria-label="fire" className="text-sm">🔥</span>
                              </motion.div>
                            )}
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 260, damping: 20 }}
                              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                                message.type === 'user' 
                                  ? 'bg-black/40 text-white border border-white/10 backdrop-blur-md' 
                                  : 'bg-white/5 text-gray-100 border border-white/5 backdrop-blur-sm'
                              }`}
                            >
                              {message.content}
                            </motion.div>
                          </motion.div>
                        ))}

                        {messages.length === 0 && (
                          <div className="h-full flex items-center justify-center text-center p-4">
                            <div className="text-gray-400 text-sm">
                              <div className="mb-3">
                                <span role="img" aria-label="chat" className="text-3xl">💬</span>
                              </div>
                              Ask questions about {foundTool.name}'s features, pricing, or use cases
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 border-t border-white/10 bg-black/40">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask about this tool..."
                            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-transparent transition-all duration-200"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={sendMessage}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 border border-white/10 backdrop-blur-sm"
                          >
                            <Send className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="text-center text-white space-y-1 mt-3">
          <p className="text-sm">Built with ❤️ for the open source community</p>
          <p className="text-sm flex items-center justify-center gap-1">
            Powered by <span role="img" aria-label="fire">🔥</span> <a href="https://www.firecrawl.dev/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">Firecrawl</a>
          </p>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <AnimatePresence mode="wait">
        {showGalleryModal && foundTool?.screenshots && foundTool.screenshots.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowGalleryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img 
                  src={foundTool.screenshots[activeScreenshot]} 
                  alt={`${foundTool.name} screenshot ${activeScreenshot + 1}`}
                  className="rounded-lg max-h-[80vh] object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;