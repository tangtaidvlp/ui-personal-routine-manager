/**
 * Mirrors specs/002-onboarding-instruction/walkthrough-script.md; edit the script first.
 * Layout reference: specs/002-onboarding-instruction/resources/ (D · Slide 1–4, D · Tour 1–5).
 */
import type { SlideContent, TourStepContent } from '../types/walkthrough.ts'

export const SLIDES: SlideContent[] = [
  {
    id: 'what',
    icon: 'calendar',
    label: 'WHAT IS MILOS?',
    title: 'Plan your days once. Then just live them.',
    body: 'Milos is a time-management app. You set up a default routine for weekdays and one for weekends, and Milos turns them into your plan for each day.',
  },
  {
    id: 'day',
    icon: 'repeat',
    label: 'HOW A DAY WORKS',
    title: 'Every day starts from your routine.',
    body: 'Each new day starts as a copy of its default routine, weekday or weekend. Follow it as planned, or move, change or tick off tasks as your day really goes.',
  },
  {
    id: 'habits',
    icon: 'chart',
    label: 'SEE HOW YOU REALLY SPEND YOUR TIME',
    title: 'Your habits, in numbers (coming soon).',
    body: "Milos keeps track of what you planned and what you actually did. Soon you'll be able to see a breakdown of how you really spend your time.",
  },
  {
    id: 'buddy',
    icon: 'sparkles',
    label: 'LET ROUTINE BUDDY DO THE WORK',
    title: "You don't have to plan every detail.",
    body: 'Tell Routine Buddy about your day ("I work 9 to 5, gym at 6") and it builds your routine for you. Later, ask it to rearrange things and it will.',
    callout: {
      heading: 'First step',
      text: 'Set up your Weekday and Weekend routines, by hand or by chatting with Routine Buddy.',
    },
  },
]

export const TOUR_STEPS: TourStepContent[] = [
  {
    target: 'schedule-switch',
    side: 'bottom',
    mobileView: 'board', // the switch is hidden in the phone chat view
    text: 'You have two default routines. Switch here to set up each one.',
  },
  {
    target: 'routine-board',
    side: 'right',
    align: 'start',
    mobileView: 'board',
    text: 'This is your default routine. Every new day starts as a copy of it.',
  },
  {
    target: 'add-task',
    side: 'top',
    mobileView: 'board',
    text: 'Add a task yourself: name, start time, length.',
  },
  {
    target: 'routine-buddy',
    side: 'left',
    align: 'start',
    mobileView: 'chat',
    text: 'Or just tell Buddy about your day, and it fills in the board for you.',
  },
  {
    target: 'finish',
    side: 'bottom',
    mobileView: 'board',
    text: 'When both routines look right, finish here. Your changes are already saved as you go.',
  },
]
