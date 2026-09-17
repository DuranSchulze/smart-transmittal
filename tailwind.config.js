/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"Segoe UI"',
  				'Roboto',
  				'sans-serif'
  			],
  			display: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'"Roboto Mono"',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'ds-caption': ['12px', { lineHeight: '1.2' }],
  			'ds-body-sm': ['14px', { lineHeight: '1.43' }],
  			'ds-body': ['16px', { lineHeight: '1.63' }],
  			'ds-subheading': ['20px', { lineHeight: '1.4', letterSpacing: '-0.16px' }],
  			'ds-heading-sm': ['22px', { lineHeight: '1.4', letterSpacing: '-0.2px' }],
  			'ds-heading': ['40px', { lineHeight: '1.05', letterSpacing: '-1.48px' }],
  			'ds-heading-lg': ['56px', { lineHeight: '1.05', letterSpacing: '-1.51px' }],
  			'ds-display': ['80px', { lineHeight: '1.05', letterSpacing: '-1.52px' }]
  		},
  		colors: {
  			/* Relate signature palette */
  			canvas: '#fcfcfc',
  			wash: '#f0f4fe',
  			ink: '#020520',
  			graphite: '#14141e',
  			caption: '#374151',
  			helper: '#6b7280',
  			divider: '#e2e8f0',
  			fog: '#f1f5f9',
  			royal: '#145aff',
  			cobalt: '#3b82f6',
  			mint: '#16ca2e',
  			coral: '#f26052',
  			azure: '#0099ff',
  			brand: {
  				'50': '#eef4ff',
  				'100': '#dbe6ff',
  				'200': '#bfd3fe',
  				'300': '#93b4fd',
  				'400': '#5f8cfb',
  				'500': '#3b82f6',
  				'600': '#145aff',
  				'700': '#0f4bd8',
  				'800': '#0d3cae',
  				'900': '#0e3488'
  			},
  			accent: {
  				'500': '#10b981',
  				'600': '#059669',
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			}
  		},
  		boxShadow: {
  			card: 'rgba(0, 0, 0, 0.1) 0px 0px 4px -2px',
  			'card-strong': 'rgba(0, 0, 0, 0.25) 0px 0px 4px -2px',
  			feature:
  				'rgba(13, 20, 33, 0.082) 0px 0.36px 1.8px -1.4px, rgba(13, 20, 33, 0.07) 0px 1.37px 6.87px -2.8px, rgba(13, 20, 33, 0.016) 0px 6px 30px -4.25px',
  			glow: 'rgba(20, 90, 255, 0.1) 0px 0px 100px -28px',
  			'glow-sm': 'rgba(20, 90, 255, 0.3) 0px 0px 4px -2px',
  			'glow-md':
  				'rgba(20, 90, 255, 0.1) 0px 0px 50px -28px, rgba(0, 0, 0, 0.18) 0px 0px 3px -1px'
  		},
  		animation: {
  			blob: 'blob 7s infinite',
  			'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
  			'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  		},
  		keyframes: {
  			blob: {
  				'0%': {
  					transform: 'translate(0px, 0px) scale(1)'
  				},
  				'33%': {
  					transform: 'translate(30px, -50px) scale(1.1)'
  				},
  				'66%': {
  					transform: 'translate(-20px, 20px) scale(0.9)'
  				},
  				'100%': {
  					transform: 'translate(0px, 0px) scale(1)'
  				}
  			},
  			fadeInUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
