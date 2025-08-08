# Luma Talk - AI Wellness Companion

Luma Talk is a React-based web application featuring an AI companion named Luma that provides mental wellness support and self-reflection guidance.

## Features

- **Interactive Chat Interface**: Talk to Luma with a modern, responsive chat interface
- **Voice Conversation**: Real-time voice chat using 11Labs AI technology
- **Video Introduction**: Meet Luma through an embedded video
- **Responsive Design**: Beautiful UI built with Tailwind CSS
- **TypeScript Support**: Full TypeScript implementation for better development experience
- **Real-time Voice Status**: Visual feedback for voice connection status

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **Voice AI**: 11Labs React integration
- **Build Tool**: Vite
- **UI Components**: Custom components with Radix UI primitives

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Input)
│   ├── VideoSection.tsx # Video player component
│   └── ChatSection.tsx  # Chat interface component
├── pages/               # Page components
│   └── Index.tsx        # Main landing page
├── lib/                 # Utility functions
│   └── utils.ts         # Common utilities
├── assets/              # Static assets
│   ├── luma-avatar.png  # Luma's avatar image
│   └── brain-background.png # Background image
├── App.tsx              # Main app component
├── main.tsx             # App entry point
└── index.css            # Global styles and design system
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd luma-talk
```

2. Install dependencies:
```bash
npm install
```

3. Add required images to `src/assets/`:
   - `luma-avatar.png` - Luma's avatar image
   - `brain-background.png` - Background image

4. Configure 11Labs API:
   - Update the API key in `ChatSection.tsx`
   - Replace the placeholder agent ID with your actual 11Labs agent ID

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Configuration

### Tailwind Design System

The application uses a custom design system defined in `src/index.css` with:
- Custom color palette optimized for wellness and calm
- HSL color definitions for better accessibility
- Luma-specific brand colors
- Dark mode support

### 11Labs Integration

To enable voice conversations:
1. Sign up for 11Labs API access
2. Create an AI agent
3. Update the API key and agent ID in `ChatSection.tsx`

## Key Components

### VideoSection
- Displays Luma introduction video
- Vimeo player integration
- Loading states and animations

### ChatSection
- Real-time chat interface
- Message history
- Voice conversation controls
- Typing indicators
- Responsive design

### UI Components
- Custom Button component with variants
- Input component with focus states
- Utility functions for className merging

## Customization

### Colors
Update colors in `src/index.css` under the `:root` selector. All colors use HSL format for consistency.

### Styling
The project uses Tailwind CSS. Modify `tailwind.config.ts` for custom configurations.

### API Integration
Replace the simulated responses in `ChatSection.tsx` with actual API calls to your preferred AI service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please contact the development team.
