
const url="https://docs.google.com/spreadsheets/d/19_oqOHcci1Ba1LdQ1xozQCGElqGH6Yd3Kn6YMmF75qQ/gviz/tq?tqx=out:csv";

Papa.parse(url,{
 download:true,
 header:true,
 complete:(r)=>{
   const data=r.data.filter(x=>Object.values(x).some(v=>String(v).trim()!==""));
   const cols=Object.keys(data[0]||{});
   document.querySelector("#summary").textContent="Total Records: "+data.length;
   document.querySelector("#tbl thead").innerHTML="<tr>"+cols.map(c=>"<th>"+c+"</th>").join("")+"</tr>";
   document.querySelector("#tbl tbody").innerHTML=data.map(row=>"<tr>"+cols.map(c=>"<td>"+(row[c]||"")+"</td>").join("")+"</tr>").join("");
 }
});
