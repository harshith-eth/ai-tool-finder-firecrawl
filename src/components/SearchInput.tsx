import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';

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

// Create a memoized component for the animated placeholder text with typewriter effect
const AnimatedPlaceholder = memo(({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState("");
  const [cursor, setCursor] = useState(true);
  const [isTyping, setIsTyping] = useState(true);
  const [isFullyTyped, setIsFullyTyped] = useState(false);
  
  // Typewriter effect - simplified and more reliable
  useEffect(() => {
    setDisplayText("");
    setIsTyping(true);
    setIsFullyTyped(false);
    let i = 0;
    
    // Create a single reliable interval for typing all characters
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setIsFullyTyped(true);
      }
    }, 40); // Slightly faster typing
    
    // Ensure cleanup on component unmount or text change
    return () => {
      clearInterval(typeInterval);
    };
  }, [text]);
  
  // Blinking cursor effect - blinks faster during typing, slower when waiting
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursor(c => !c);
    }, isTyping ? 330 : 530);
    
    return () => clearInterval(cursorInterval);
  }, [isTyping]);
  
  return (
    <motion.div
      variants={placeholderVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="text-gray-400 origin-left whitespace-nowrap overflow-hidden text-ellipsis flex"
    >
      <span>{displayText}</span>
      <span 
        className={`${cursor ? 'opacity-100' : 'opacity-0'} ml-0.5 transition-opacity`}
        style={{ 
          background: 'linear-gradient(to right, #3b82f6, #10b981)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}
      >|</span>
    </motion.div>
  );
});

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
    scale: 1.05,
    y: -3,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10 
    }
  },
  tap: { 
    scale: 0.95,
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300,
      damping: 15
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
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [changingPlaceholder, setChangingPlaceholder] = useState(false);
  
  // Reference to search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Sample placeholder suggestions
  const placeholderSuggestions = [
    "Find me a tool that can generate realistic AI images",
    "What's the best AI for writing marketing copy?",
    "I need an AI assistant for coding in Python",
    "Looking for a ChatGPT alternative with better features",
    "Show me tools that can analyze financial data",
    "I want an AI that can edit videos automatically",
    "Need a tool that can transcribe and summarize meetings",
    "Find an AI for creating professional presentations",
    "What tools help with social media content creation?",
    "I need an AI voice generator for my podcast"
  ];
  
  // Define suggestion buttons
  const suggestionButtons = [
    "Content creation",
    "Image generation",
    "Video editing",
    "ChatGPT alternative",
    "Data analysis"
  ];
  
  // Improved placeholder rotation logic
  useEffect(() => {
    // Initial delay before starting rotation
    const initialDelay = setTimeout(() => {
      // Set up the rotation interval
      const rotationInterval = setInterval(() => {
        if (!changingPlaceholder) {
          setChangingPlaceholder(true);
          
          // Wait a bit before changing to next placeholder to ensure smooth exit animation
          setTimeout(() => {
            setCurrentPlaceholderIndex(prevIndex => 
              prevIndex === placeholderSuggestions.length - 1 ? 0 : prevIndex + 1
            );
            
            // Reset the changing flag after a short delay to allow animations to complete
            setTimeout(() => {
              setChangingPlaceholder(false);
            }, 300);
          }, 500);
        }
      }, 9000); // Increased to 9 seconds for longer display time
      
      return () => clearInterval(rotationInterval);
    }, 2000); // Slightly longer initial delay
    
    return () => clearTimeout(initialDelay);
  }, [changingPlaceholder, placeholderSuggestions.length]);
  
  // Function to handle search, including from Enter key
  const handleSearch = () => {
    if (!query.trim() || isProcessing) return;
    onSearch(query); // Call the parent component's search function
  };
  
  // Function to set a suggestion as the query
  const setSearchSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    // Focus the input after setting suggestion
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
            />
            {!query && (
              <div className="absolute inset-0 pointer-events-none flex items-center px-4">
                <div className="relative w-full text-left">
                  <AnimatePresence mode="wait">
                    <AnimatedPlaceholder 
                      key={currentPlaceholderIndex} 
                      text={placeholderSuggestions[currentPlaceholderIndex]} 
                    />
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </div>
        
        <motion.button
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20,
            delay: 0.45
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSearch}
          disabled={isProcessing}
          className="px-6 py-3 bg-black hover:bg-black/80 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-70 transition-all duration-200 border border-white/10"
        >
          {isProcessing ? (
            <motion.div 
              className="flex items-center gap-2"
              animate={{ opacity: [0.6, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching...</span>
            </motion.div>
          ) : (
            'Find Tool'
          )}
        </motion.button>
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