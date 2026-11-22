import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FolderOpen, FileText, ListTodo, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';

const cleanTerm=(q:string)=>q.replace(/[%_\\,()]/g,'').trim().slice(0,90);
export default function GlobalSearch(){
  const [params,setParams]=useSearchParams();
  const q=cleanTerm(params.get('q')||'');
  const [text,setText]=useState(q);
  const search=useQuery({queryKey:['amcf-global-search',q],enabled:q.length>=2,queryFn:async()=>{
    const [cases,docs,tasks]=await Promise.all([
      supabase.from('amcf_cases')
        .select('id,cnj_number,reference,title,claimant,defendant,court_unit')
        .is('archived_at',null).or('title.ilike.%'+q+'%,reference.ilike.%'+q+'%,cnj_number.ilike.%'+q+'%,claimant.ilike.%'+q+'%,defendant.ilike.%'+q+'%,court_unit.ilike.%'+q+'%').limit(30),
      supabase.from('amcf_documents')
        .select('id,case_id,title,category').ilike('title','%'+q+'%').limit(30),
      supabase.from('amcf_tasks')
        .select('id,case_id,title,status,due_on').ilike('title','%'+q+'%').limit(30)
    ]);
    if(cases.error)throw cases.error;
    if(docs.error)throw docs.error;
    if(tasks.error)throw tasks.error;
    return {cases:cases.data||[],docs:docs.data||[],tasks:tasks.data||[]};
  }});
  const sections=[
    {name:'Processos',icon:FolderOpen,items:(search.data?.cases||[]).map(x=>({id:x.id,url:'/casos/'+x.id,title:x.cnj_number||x.reference,desc:x.title+(x.claimant?' · Autor: '+x.claimant:'')}))},
    {name:'Documentos',icon:FileText,items:(search.data?.docs||[]).map(x=>({id:x.id,url:'/documentos?caso='+x.case_id,title:x.title,desc:'Categoria: '+x.category}))},
    {name:'Tarefas',icon:ListTodo,items:(search.data?.tasks||[]).map(x=>({id:x.id,url:x.case_id?'/casos/'+x.case_id:'/tarefas',title:x.title,desc:'Situação: '+x.status+(x.due_on?' · Data: '+x.due_on:'')}))}
  ];
  return <div className="space-y-6">
    <PageHeader eyebrow="AMCF / LOCALIZADOR" title="Pesquisa global" description="Encontre processos, documentos e tarefas entre os registros que seu perfil pode acessar."/>
    <section className="data-panel p-6">
      <form className="flex gap-3" onSubmit={e=>{e.preventDefault();setParams(text.trim().length>=2?{q:cleanTerm(text)}:{});}}>
        <Input autoFocus aria-label="Pesquisar no CRM" placeholder="Nº CNJ, autor, réu, vara, documento ou tarefa" value={text} onChange={e=>setText(e.target.value)} maxLength={90}/>
        <Button type="submit" disabled={text.trim().length<2}><Search/>Buscar</Button>
      </form>
      {q.length<2&&<p className="mt-4 text-xs text-muted-foreground">Informe ao menos dois caracteres para pesquisar.</p>}
      {q.length>=2&&<QueryState loading={search.isPending} error={search.isError} empty={!search.isPending&&!search.isError&&sections.every(s=>!s.items.length)} title="Nenhum registro encontrado" description="Consulte outra palavra ou confira o seu nível de acesso." onRetry={()=>void search.refetch()}/>}
    </section>
    {q.length>=2&&!search.isPending&&!search.isError&&sections.filter(s=>s.items.length>0).map(s=><section key={s.name} className="data-panel p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><s.icon size={17}/>{s.name} ({s.items.length})</h2>
      <div className="mt-4 divide-y">{s.items.map(x=><Link key={x.id} className="flex items-center justify-between gap-3 py-3 hover:text-primary" to={x.url}><div className="min-w-0"><strong className="block truncate text-sm">{x.title}</strong><p className="mt-1 truncate text-xs text-muted-foreground">{x.desc}</p></div><ArrowUpRight size={16}/></Link>)}</div>
    </section>)}
    <p className="text-xs text-muted-foreground">Resultados limitados aos 30 primeiros registros de cada categoria e às permissões do usuário autenticado. O conteúdo clínico dos arquivos não é exposto nos resultados gerais.</p>
  </div>;
}
