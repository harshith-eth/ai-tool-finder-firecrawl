# AI Tool Finder

🔍 A modern web application that helps users discover the most relevant AI tools based on their specific needs. The application leverages the [Firecrawl API](https://www.firecrawl.dev/) to search through over 200 AI directories, providing accurate and comprehensive results.

<p align="center">
  <img src="https://www.firecrawl.dev/og.png" alt="AI Tool Finder" width="600">
</p>

## ✨ Features

- **Clean Modern UI**: Black translucent blurry design with beautiful animations
- **Split Layout**: Tool information on the left (3/4) and chat interface on the right (1/4)
- **Tabbed Interface**: Easily navigate between Features, Use Cases, Pricing, Reviews, and more
- **Media Section**: View demo videos and screenshots with an image carousel
- **Dynamic Search**: Rotating placeholder suggestions and clickable topic buttons
- **Responsive Design**: Fully optimized for all screen sizes
- **Comprehensive Results**: Get detailed information about each AI tool including pricing, reviews, and use cases

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **API Integration**: Firecrawl API
- **State Management**: React Context API
- **Authentication**: Firebase Auth

## 🔍 How It Works

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px', 'fontFamily': 'Arial', 'primaryColor': '#3498db', 'primaryTextColor': '#fff', 'primaryBorderColor': '#2374ab', 'lineColor': '#000000', 'textColor': '#000000', 'fontSize': '20px' }}}%%

flowchart TD
    %% Main Nodes
    User((👤 USER)):::user
    Search[/🔍 SEARCH QUERY\]:::input
    Frontend[📱 AI TOOL FINDER]:::processing
    API[🔥 FIRECRAWL API]:::processing
    Extract[🔄 CONTENT EXTRACTION]:::data
    Directory1[📂 AI DIRECTORY 1]:::source
    Directory2[📂 AI DIRECTORY 2]:::source
    DirectoryN[📂 AI DIRECTORY N]:::source
    Processor[⚙️ DATA PROCESSOR]:::processing
    DB[(💾 TOOL DATABASE)]:::data
    Results[📊 RESULTS DISPLAY]:::output
    Filter[🔍 FILTER & SORT]:::input
    Details[📋 DETAILED TOOL VIEW]:::output
    
    %% Connections with clear text
    User -->|"TYPES QUERY"| Search
    Search -->|"SUBMITS"| Frontend
    Frontend -->|"REQUESTS DATA"| API
    API -->|"SCRAPES"| Directory1
    API -->|"SCRAPES"| Directory2
    API -->|"SCRAPES"| DirectoryN
    Directory1 -->|"RAW HTML"| Extract
    Directory2 -->|"RAW HTML"| Extract
    DirectoryN -->|"RAW HTML"| Extract
    Extract -->|"STRUCTURED DATA"| Processor
    Processor -->|"INDEXED TOOLS"| DB
    DB -->|"RELEVANT TOOLS"| Results
    Results -->|"DISPLAYS TO"| User
    User -->|"APPLIES FILTERS"| Filter
    Filter -->|"UPDATES"| Results
    User -->|"SELECTS TOOL"| Details
    Details -->|"SHOWS"| User
    
    %% Styling with high contrast
    classDef user fill:#9b59b6,stroke:#000,stroke-width:3px,color:#fff,font-weight:bold
    classDef input fill:#3498db,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    classDef processing fill:#e74c3c,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    classDef source fill:#2ecc71,stroke:#000,stroke-width:2px,color:#000,font-weight:bold
    classDef data fill:#f39c12,stroke:#000,stroke-width:2px,color:#000,font-weight:bold
    classDef output fill:#1abc9c,stroke:#000,stroke-width:2px,color:#000,font-weight:bold
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firecrawl API key (get one [here](https://www.firecrawl.dev/))
- Azure API key for AI assistant functionality

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/firecrawl-dev/ai-tool-finder.git
   cd ai-tool-finder
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

## 📂 Project Structure

```
ai-tool-finder/
├── public/             # Static assets
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main application component
│   ├── background.tsx  # Animated particle background
│   └── main.tsx        # Application entry point
├── .env                # Environment variables
├── package.json        # Project dependencies
└── README.md           # This documentation
```

## 🤝 Contributing

We welcome contributions from the community! To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <a href="https://www.firecrawl.dev/sign" target="_blank">
    <img src="https://img.shields.io/badge/Sign_up_for_Firecrawl-FF4500?style=for-the-badge&logo=firebase&logoColor=white" alt="Sign up for Firecrawl">
  </a>
</p>

<p align="center">
  Built with ❤️ for the open source community
</p>

<p align="center">
  Powered by
  <br>
  <a href="https://www.firecrawl.dev/" target="_blank">
    🔥 Firecrawl
  </a>
</p>

---

## 📞 Contact

For any queries, reach out to Eric Ciarla ([@ericciarla](https://twitter.com/ericciarla)) - Co-Founder of Firecrawl

Follow us on Twitter: [@firecrawl_dev](https://x.com/firecrawl_dev)

We are publishing more such tools! Stay tuned and feel free to contribute to this project.