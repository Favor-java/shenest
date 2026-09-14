import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { MapPin, Wallet } from 'lucide-react';
import { GET_ROOMMATES, SAVE_ROOMMATE } from '../graphql/operations.js';

export default function Roommates() {
  const [location, setLocation] = useState('');
  const [form, setForm] = useState({ bio:'', location:'', budget:'', moveIn:'', lifestyle:'' });
  const [notice, setNotice] = useState('');
  const { data, loading } = useQuery(GET_ROOMMATES, { variables: { location: location || null } });
  const [saveProfile, saveState] = useMutation(SAVE_ROOMMATE, { refetchQueries: [{ query: GET_ROOMMATES, variables: { location: location || null } }] });

  function update(event){ setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event){ event.preventDefault(); if(!localStorage.getItem('shenest_token')) return setNotice('Please log in to create a roommate profile.'); try { await saveProfile({variables:{...form,budget:Number(form.budget),moveIn:form.moveIn||null,lifestyle:form.lifestyle||null}}); setNotice('Your roommate profile is live.'); } catch(error){ setNotice(error.message); } }

  return <main className="page section">
    <div className="page-heading"><p className="eyebrow">Roommate matching</p><h1>Find someone you can live well with.</h1><p>Simple profiles help you find women with a similar location, budget and lifestyle.</p></div>
    <div className="roommate-layout">
      <section><input className="roommate-search" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Filter by location" />
        <div className="roommate-list">{loading?<p>Loading profiles...</p>:(data?.roommateProfiles??[]).map(profile=><article className="roommate-card" key={profile.id}><div className="avatar">{profile.user.name.slice(0,2).toUpperCase()}</div><div><h3>{profile.user.name}</h3><p>{profile.bio}</p><div className="roommate-meta"><span><MapPin size={14}/>{profile.location}</span><span><Wallet size={14}/>₦{profile.budget.toLocaleString()}</span></div>{profile.lifestyle&&<small>{profile.lifestyle}</small>}</div></article>)}</div>
      </section>
      <aside className="profile-form"><h2>Create your profile</h2><form onSubmit={submit}><label>About you<textarea name="bio" value={form.bio} onChange={update} rows="4" required/></label><label>Preferred location<input name="location" value={form.location} onChange={update} required/></label><label>Budget (₦)<input name="budget" type="number" value={form.budget} onChange={update} required/></label><label>Move-in period<input name="moveIn" value={form.moveIn} onChange={update} placeholder="e.g. October 2026"/></label><label>Lifestyle<input name="lifestyle" value={form.lifestyle} onChange={update} placeholder="Quiet, tidy, early riser..."/></label>{notice&&<p className="form-message">{notice}</p>}<button className="button full" disabled={saveState.loading}>{saveState.loading?'Saving...':'Save profile'}</button></form></aside>
    </div>
  </main>;
}
