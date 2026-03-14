'use client';

import { Users, Send, CheckCircle, MessageSquare } from 'lucide-react';

export default function StatsCards({ leads }: { leads: any[] }) {
  const totalLeads = leads.length;
  const emailsSent = leads.filter(l => l.emailStatus === 'sent' || l.emailStatus === 'replied').length;
  const replies = leads.filter(l => l.emailStatus === 'replied').length;
  const replyRate = totalLeads > 0 ? ((replies / emailsSent) * 100).toFixed(1) : 0;

  const stats = [
    { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Emails Sent', value: emailsSent, icon: Send, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Replies', value: replies, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Reply Rate', value: `${replyRate}%`, icon: CheckCircle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
