import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const out=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
async function secureEquals(a:string,b:string){
 const enc=new TextEncoder();
 const [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(a)),crypto.subtle.digest("SHA-256",enc.encode(b))]);
 const xv=new Uint8Array(x),yv=new Uint8Array(y);let bad=0;
 for(let i=0;i<xv.length;i++)bad|=xv[i]^yv[i];
 return bad===0&&a.length===b.length;
}
Deno.serve(async req=>{
 if(req.method!=="POST")return out({ok:false},405);
 const match=/^Bearer ([a-f0-9]{96})$/.exec(req.headers.get("Authorization")||"");
 if(!match)return out({ok:false,error:"Unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!key)return out({ok:false,error:"Unavailable"},503);
 const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:secret,error:secretError}=await supabase.rpc("amcf_ai_cleanup_token");
 if(secretError||typeof secret!=="string"||secret.length!==96||!(await secureEquals(match[1],secret)))return out({ok:false,error:"Unauthorized"},401);
 let removed=0,batches=0,failed=0;
 for(let i=0;i<5;i++){
   const {data:expired,error:queryError}=await supabase.from("amcf_ai_staged_files").select("id,storage_path").lt("expires_at",new Date().toISOString()).order("expires_at").limit(80);
   if(queryError){failed++;break;}
   if(!expired?.length)break;
   const {error:storageError}=await supabase.storage.from("amcf-ai-staging").remove(expired.map((x:{storage_path:string})=>x.storage_path));
   if(storageError){failed++;break;}
   const ids=expired.map((x:{id:string})=>x.id);
   const {error:dbError}=await supabase.from("amcf_ai_staged_files").delete().in("id",ids);
   if(dbError){failed++;break;}
   removed+=expired.length;batches++;
 }
 return out({ok:failed===0,removed,batches,failed},failed?503:200);
});