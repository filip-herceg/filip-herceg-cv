'use client'
import React from 'react'

type State = { hasError: boolean }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Client error boundary', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-semibold mb-4">Something went wrong.</h1>
          <p className="text-muted-foreground">Try refreshing the page or returning later.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
