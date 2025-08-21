import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { conferenceTheme } from './theme/conferenceTheme'
import { AuthProvider } from './components/Layout/AuthProvider'
import { AppLayout } from './components/Layout/AppLayout'
import { MaterialErrorBoundary } from './components/Layout/MaterialErrorBoundary'
import { PageLoader } from './components/Layout/PageLoader'
import ConferenceInfo from './pages/ConferenceInfo'
import Submissions from './pages/Submissions'
import Reviews from './pages/Reviews'
import Payment from './pages/Payment'
import AdminDashboard from './pages/AdminDashboard'
import { Suspense, lazy } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Lazy load pages for better performance
const LazyAbstractBook = lazy(() => import('./pages/AbstractBook'))
const LazyAdminPayments = lazy(() => import('./pages/AdminPayments'))
const LazyReviewSubmission = lazy(() => import('./pages/ReviewSubmission'))
const LazyLogin = lazy(() => import('./pages/Login'))
const LazyProfile = lazy(() => import('./pages/Profile'))

function App() {
  return (
    <MaterialErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={conferenceTheme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <AppLayout>
                <Suspense fallback={<PageLoader message="Loading page..." />}>
                  <Routes>
                    <Route path="/" element={<ConferenceInfo />} />
                    <Route path="/conference" element={<ConferenceInfo />} />
                    <Route path="/login" element={<LazyLogin />} />
                    <Route path="/profile" element={<LazyProfile />} />
                    <Route path="/dashboard" element={<Submissions />} />
                    <Route path="/submissions" element={<Submissions />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/reviews/:submissionId" element={<LazyReviewSubmission />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/payments" element={<LazyAdminPayments />} />
                    <Route path="/abstract-book" element={<LazyAbstractBook />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MaterialErrorBoundary>
  )
}

export default App