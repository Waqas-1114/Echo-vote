import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Eye, 
  GitBranch, 
  Shield, 
  ArrowRight, 
  MessageSquare, 
  CheckCircle,
  TrendingUp 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">EchoVote</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
            <Link href="/complaints" className="text-gray-600 hover:text-gray-900">Browse Issues</Link>
          </nav>
          <div className="flex space-x-2">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            📋 EchoVote — The Transparent <br />
            <span className="text-blue-600">Feedback Democracy</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            A civic platform where every feedback submission is{" "}
            <span className="font-semibold text-blue-600">publicly trackable</span>, 
            like GitHub issues for governance. Empowering citizens and building trust 
            in Indian administrative bodies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="min-w-[200px]">
                Submit Your First Issue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/complaints">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Eye className="mr-2 w-4 h-4" />
                Browse Public Issues
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">❌ The Problem</CardTitle>
              </CardHeader>
              <CardContent className="text-red-700">
                <p className="mb-4">
                  Public feedback systems (for government, transport, or education) are opaque — 
                  people's voices vanish into databases.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• No transparency in complaint resolution</li>
                  <li>• Citizens can't track progress</li>
                  <li>• No accountability metrics</li>
                  <li>• Duplicate complaints go unnoticed</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">✅ The Solution</CardTitle>
              </CardHeader>
              <CardContent className="text-green-700">
                <p className="mb-4">
                  A civic platform where every feedback submission is publicly trackable, 
                  with transparent status updates and hierarchical escalation.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• Public tracking like GitHub issues</li>
                  <li>• Status: submitted → seen → action → fixed</li>
                  <li>• Accountability metrics per department</li>
                  <li>• Community support and verification</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why EchoVote is Unique</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <Eye className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Complete Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Every complaint is publicly visible with real-time status updates. 
                  No more black box systems.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <GitBranch className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Hierarchical Escalation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Issues automatically escalate from Panchayat → Block → District → State 
                  if unresolved within SLA.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Anonymous Options</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Citizens can submit complaints anonymously while maintaining 
                  full transparency of the issue itself.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Community Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Other citizens can upvote similar issues and add supportive comments, 
                  showing community impact.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Public dashboards showing response times, resolution rates, 
                  and department performance.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Verified Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Citizens and senior officials can verify that issues are 
                  actually resolved, not just marked as closed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-blue-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Submit Your Issue</h3>
                  <p className="text-gray-600">
                    Post feedback (e.g., "Broken streetlight in Ward 14") with location details. 
                    Choose to remain anonymous or use your identity.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Public Tracking</h3>
                  <p className="text-gray-600">
                    Status visible publicly: submitted → seen → under action → fixed. 
                    Get a unique ticket number for reference.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Government Response</h3>
                  <p className="text-gray-600">
                    Tagged government department/ward/panchayat gets notified and 
                    must update status and provide resolution timeline.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Escalation & Resolution</h3>
                  <p className="text-gray-600">
                    If not resolved within SLA, automatically escalates to higher authority. 
                    Ticket closed only after verification and citizen approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make Your Voice Heard?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of citizens building a more transparent democracy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?type=citizen">
              <Button size="lg" variant="secondary" className="min-w-[200px]">
                Citizen Registration
              </Button>
            </Link>
            <Link href="/auth/register?type=officer">
              <Button size="lg" variant="outline" className="min-w-[200px] text-white border-white hover:bg-white hover:text-blue-600">
                Government Officer Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-6 h-6" />
                <span className="text-lg font-bold">EchoVote</span>
              </div>
              <p className="text-gray-400">
                Transparent feedback democracy for a better India.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/complaints" className="hover:text-white">Browse Issues</Link></li>
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Citizens</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/register" className="hover:text-white">Register</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/guidelines" className="hover:text-white">Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Government</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/register?type=officer" className="hover:text-white">Officer Portal</Link></li>
                <li><Link href="/api-docs" className="hover:text-white">API Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 EchoVote. Building transparency in governance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
