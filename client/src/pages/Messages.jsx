import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link, useParams } from 'react-router-dom';
import { GET_MESSAGES, SEND_MESSAGE } from '../graphql/operations.js';

export default function Messages(){
  const {userId}=useParams();
  const currentUser=JSON.parse(localStorage.getItem('shenest_user')||'null');
  const [text,setText]=useState('');
  const {data,loading,error}=useQuery(GET_MESSAGES,{variables:{userId},skip:!currentUser});
  const [send,{loading:sending}]=useMutation(SEND_MESSAGE,{refetchQueries:[{query:GET_MESSAGES,variables:{userId}}]});
  if(!currentUser)return <main className="empty-page"><div><h1>Messages</h1><p>Log in to contact another SheNest member.</p><Link className="button" to="/login">Log in</Link></div></main>;
  async function submit(event){event.preventDefault();if(!text.trim())return;await send({variables:{receiverId:userId,text}});setText('');}
  const messages=data?.messagesWith??[];
  const otherName=messages[0]?(messages[0].senderId===currentUser.id?messages[0].receiver.name:messages[0].sender.name):'SheNest member';
  return <main className="messages-page"><div className="chat-card"><header><Link to="/roommates">←</Link><div><strong>{otherName}</strong><small>SheNest conversation</small></div></header><div className="chat-body">{loading&&<p>Loading conversation...</p>}{error&&<p>Could not load messages.</p>}{!loading&&messages.length===0&&<div className="chat-empty"><p>No messages yet.</p><span>Say hello and start a respectful conversation.</span></div>}{messages.map(message=><div className={message.senderId===currentUser.id?'message mine':'message'} key={message.id}>{message.text}</div>)}</div><form className="chat-form" onSubmit={submit}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message..."/><button className="button" disabled={sending}>Send</button></form></div></main>;
}
