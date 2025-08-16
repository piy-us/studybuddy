import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: 'hsl(var(--background))',
					secondary: 'hsl(var(--background-secondary))'
				},
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					variant: 'hsl(var(--primary-variant))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					blue: 'hsl(var(--accent-blue))',
					purple: 'hsl(var(--accent-purple))',
					green: 'hsl(var(--accent-green))',
					orange: 'hsl(var(--accent-orange))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					border: 'hsl(var(--card-border))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			height: {
				'9': '2.25rem',  /* 36px - nav items, inputs */
				'10': '2.5rem',  /* 40px - header, primary buttons */
				'25': '6.25rem', /* 100px - folder cards */
				'55': '13.75rem' /* 220px - quiz generator height */
			},
			width: {
				'45': '11.25rem', /* 180px - folder cards */
				'80': '20rem',    /* 320px - chat widget */
				'100': '25rem'    /* 400px - quiz generator */
			},
			spacing: {
				'1': '0.25rem',  /* 4px - tighter than default */
				'2': '0.5rem',   /* 8px */
				'3': '0.75rem',  /* 12px */
				'4': '1rem',     /* 16px */
				'6': '1.5rem',   /* 24px */
				'8': '2rem',     /* 32px */
				'10': '2.5rem',  /* 40px - header height */
				'14': '3.5rem',  /* 56px - collapsed sidebar */
				'18': '4.5rem',  /* 72px */
				'70': '17.5rem', /* 280px - expanded sidebar */
				'100': '25rem'   /* 400px - quiz generator width */
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-blue-purple': 'var(--gradient-blue-purple)',
				'gradient-green': 'var(--gradient-green)',
				'gradient-orange': 'var(--gradient-orange)',
				'gradient-subtle': 'var(--gradient-subtle)'
			},
			transitionProperty: {
				'fast': 'var(--transition-fast)',
				'smooth': 'var(--transition-smooth)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
