import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/store/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/context/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/molecules/tailwind-molecules.json",
		"./src/components/organisms/tailwind-organisms.json",
		"./src/components/shared/tailwind-catalog.json",
		"./src/components/shared/tailwind-classes.json",
	],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				sidebar: 'hsl(var(--sidebar, var(--card)))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					tint: {
						1: 'hsl(var(--card-tint-1))',
						2: 'hsl(var(--card-tint-2))',
						3: 'hsl(var(--card-tint-3))',
						4: 'hsl(var(--card-tint-4))',
						5: 'hsl(var(--card-tint-5))'
					}
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			boxShadow: {
				'glow-sm': '0 0 12px -2px hsl(var(--primary) / 0.2)',
				'glow': '0 0 24px -4px hsl(var(--primary) / 0.25)',
				'glow-lg': '0 0 32px -6px hsl(var(--primary) / 0.3)',
				'inner-bezel': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.05)',
				'card': '0 2px 8px -2px hsl(0 0% 0% / 0.05), 0 4px 16px -4px hsl(0 0% 0% / 0.02)',
				'card-hover': '0 4px 16px -4px hsl(0 0% 0% / 0.08), 0 8px 24px -8px hsl(0 0% 0% / 0.04)',
				'elevated': '0 12px 32px -4px hsl(0 0% 0% / 0.12), 0 4px 12px -4px hsl(0 0% 0% / 0.06)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-in-up': {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in-right': {
					from: { opacity: '0', transform: 'translateX(-8px)' },
					to: { opacity: '1', transform: 'translateX(0)' }
				},
				'scale-in': {
					from: { opacity: '0', transform: 'scale(0.95)' },
					to: { opacity: '1', transform: 'scale(1)' }
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-in-up': 'fade-in-up 0.4s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
			},
			transitionDuration: {
				'250': '250ms',
				'350': '350ms',
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
