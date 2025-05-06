import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { InteractiveHoverButton } from './FindTool';

// Define the placeholder animation variants
const placeholderVariants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Define suggestion button variants
const suggestionVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 5 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.05 * i,
      duration: 0.3,
      type: "spring",
      stiffness: 150,
      damping: 15,
      mass: 0.5
    }
  }),
  hover: {
    y: -1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.3)',
    transition: { 
      type: "spring", 
      stiffness: 400,
      damping: 10
    }
  },
  tap: { 
    y: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transition: { 
      type: "spring", 
      stiffness: 400,
      damping: 10
    }
  }
};

// Define props interface for SearchInput component
interface SearchInputProps {
  onSearch: (query: string) => void;
  isProcessing: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isProcessing }) => {
  const [query, setQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  // Reference to search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Sample placeholder suggestions with proper typing sequence
  const placeholderSequence = [
    'Find me a tool that can generate realistic AI images', 
    3000,
    'What\'s the best AI for writing marketing copy?',
    3000,
    'I need an AI assistant for coding in Python',
    3000,
    'Looking for a ChatGPT alternative with better features',
    3000,
    'Show me tools that can analyze financial data',
    3000
  ];
  
  // Define suggestion buttons
  const suggestionButtons = [
    "Content creation",
    "Image generation",
    "Video editing",
    "ChatGPT alternative",
    "Data analysis"
  ];
  
  // Function to handle search, including from Enter key
  const handleSearch = () => {
    if (!query.trim() || isProcessing) return;
    onSearch(query);
  };
  
  // Function to set a suggestion as the query
  const setSearchSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="w-full">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.1
          }
        }}
        className="flex items-center justify-center mb-8 relative"
      >
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.9, 1]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute inset-0 bg-white/5 rounded-full filter blur-xl"
          style={{ width: '80px', height: '80px', top: '-10px', left: 'calc(50% - 40px)' }}
        />
        <Search className="w-12 h-12 text-white" />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ 
          duration: 0.6, 
          delay: 0.15, 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="text-3xl font-bold text-center text-white mb-2"
      >
        Find the Perfect AI Tool
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ 
          duration: 0.6, 
          delay: 0.25, 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="text-center text-gray-300 mb-8"
      >
        We'll search 200+ AI directories to find exactly what you need
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6, 
          delay: 0.35, 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="flex gap-2"
      >
        <div className="flex-1 relative overflow-hidden">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              boxShadow: isInputFocused ? "0 0 0 2px rgba(255, 255, 255, 0.2)" : "0 0 0 0px rgba(255, 255, 255, 0)"
            }}
            style={{
              boxShadow: "0 0 0 0px rgba(255, 255, 255, 0)"
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              delay: 0.4
            }}
            className={`w-full rounded-lg ${isInputFocused ? 'bg-black/70' : 'bg-black/60'} overflow-hidden transition-colors duration-300`}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              ref={searchInputRef}
              className="w-full px-4 py-3 bg-transparent border border-white/10 text-white focus:outline-none focus:ring-0 focus:border-white/20 transition-all duration-300"
              placeholder={query ? '' : undefined}
            />
            {!query && (
              <div className="absolute inset-0 pointer-events-none flex items-center px-4">
                <div className="text-gray-400">
                  <TypeAnimation
                    sequence={placeholderSequence}
                    wrapper="span"
                    speed={50}
                    repeat={Infinity}
                    cursor={true}
                    style={{
                      display: 'inline-block',
                      color: '#9CA3AF'
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
        
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20,
            delay: 0.45
          }}
        >
          {isProcessing ? (
            <motion.button
              className="px-6 py-3 bg-black/60 hover:bg-black/70 text-gray-200 rounded-lg font-medium flex items-center gap-2 disabled:opacity-70 transition-all duration-200 border border-white/10"
              animate={{ opacity: [0.6, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              disabled
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching...</span>
            </motion.button>
          ) : (
            <InteractiveHoverButton 
              onClick={handleSearch}
              logo={<Search className="w-5 h-5 text-gray-200" />}
            >
              Find Tool
            </InteractiveHoverButton>
          )}
        </motion.div>
      </motion.div>
      
      {/* Search suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 0.15, 
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1]
        }}
        className="mt-4 flex flex-wrap gap-2 justify-center"
      >
        <AnimatePresence>
          {suggestionButtons.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              custom={index}
              variants={suggestionVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSearchSuggestion(suggestion)}
              className="px-3 py-1.5 text-sm bg-white/5 text-white rounded-full border border-white/10"
            >
              {suggestion}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SearchInput; 