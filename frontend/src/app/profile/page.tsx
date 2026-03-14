'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { email: user?.email ?? '', newPassword: '' },
  });

  const onSubmit = async (data: any) => {
    try {
      const payload: any = {};
      if (data.email) payload.email = data.email;
      if (data.newPassword) payload.newPassword = data.newPassword;
      await authApi.updateProfile(payload);
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  return (
    <AppShell>
      <PageHeader title="My profile" />
      <div className="p-6">
        <div className="card p-6 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-lg">
              {user?.loginId?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.loginId}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()} · {user?.email}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Login ID</label>
              <input className="input bg-gray-50 cursor-not-allowed" value={user?.loginId ?? ''} readOnly />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register('email')} />
            </div>
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" placeholder="Leave blank to keep current" {...register('newPassword')} />
              <p className="text-xs text-gray-400 mt-1">Min 8 chars, must include uppercase, lowercase & special character</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
