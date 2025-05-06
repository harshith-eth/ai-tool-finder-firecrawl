# AI Tool Finder with Firecrawl

A modern web application that helps users find the most relevant AI tools based on their specific needs. The application leverages the Firecrawl API to search through over 200 AI directories to provide accurate and comprehensive results.

## Features

- **Clean Modern UI**: Black translucent blurry design with beautiful animations
- **Split Layout**: Tool information on the left (3/4) and chat interface on the right (1/4)
- **Tabbed Interface**: Easily navigate between Features, Use Cases, Pricing, Reviews, and more
- **Media Section**: View demo videos and screenshots with an image carousel
- **Dynamic Search**: Rotating placeholder suggestions and clickable topic buttons
- **Responsive Design**: Fully optimized for all screen sizes

## Tech Stack

- **Frontend**: React, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **API**: Firecrawl

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/harshith-eth/ai-tool-finder-firecrawl.git
   cd ai-tool-finder-firecrawl
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```
   VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key_here
   VITE_AZURE_API_KEY=your_azure_api_key_here
   VITE_AZURE_ENDPOINT=your_azure_endpoint_here
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Build for production
   ```bash
   npm run build
   # or
   yarn build
   ```

## Project Structure

- `src/App.tsx` - Main application component
- `src/background.tsx` - Animated particle background
- `src/main.tsx` - Application entry point

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Firecrawl API
- Inspiration from modern design trends