type Country = "BR" | "PT" | "US" | "UK" | "CA" | "DE" | "ES" | "REMOTE";

export function CountryFlag({ country }: { country: string }) {
  const code = country as Country;
  return <svg className="countryFlag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
    {code === "BR" && <><rect width="30" height="20" fill="#169b53"/><path d="M15 2.4 27 10 15 17.6 3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.3" fill="#244b9b"/><path d="M11 9c2.4-.6 5.4-.2 8 1.7" fill="none" stroke="white" strokeWidth=".7"/></>}
    {code === "PT" && <><rect width="30" height="20" fill="#e23b3d"/><rect width="12" height="20" fill="#148049"/><circle cx="12" cy="10" r="4" fill="#ffce47"/><path d="M10 7h4v4c0 2-2 3-2 3s-2-1-2-3Z" fill="#fff"/></>}
    {code === "US" && <><rect width="30" height="20" fill="#fff"/>{[0,3,6,9,12,15,18].map(y=><rect key={y} y={y} width="30" height="1.5" fill="#b53940"/>)}<rect width="13" height="10.5" fill="#29477c"/><path d="M2 2h1v1H2zm3 0h1v1H5zm3 0h1v1H8zm-6 3h1v1H2zm3 0h1v1H5zm3 0h1v1H8zm-6 3h1v1H2zm3 0h1v1H5zm3 0h1v1H8z" fill="#fff"/></>}
    {code === "UK" && <><rect width="30" height="20" fill="#24447c"/><path d="M0 0l30 20M30 0 0 20" stroke="#fff" strokeWidth="4"/><path d="M0 0l30 20M30 0 0 20" stroke="#c73243" strokeWidth="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6"/><path d="M15 0v20M0 10h30" stroke="#c73243" strokeWidth="3"/></>}
    {code === "CA" && <><rect width="30" height="20" fill="#fff"/><rect width="7" height="20" fill="#d52b35"/><rect x="23" width="7" height="20" fill="#d52b35"/><path d="m15 3 1.2 3 2-1-1 2.6 2.2.4-2.2 2 .5 2-2-.6V16h-1v-4.6l-2 .6.5-2-2.2-2 2.2-.4-1-2.6 2 1Z" fill="#d52b35"/></>}
    {code === "DE" && <><rect width="30" height="20" fill="#f7ce46"/><rect width="30" height="13.3" fill="#d2393e"/><rect width="30" height="6.7" fill="#222"/></>}
    {code === "ES" && <><rect width="30" height="20" fill="#c92f35"/><rect y="5" width="30" height="10" fill="#f8cd47"/></>}
    {code === "REMOTE" && <><rect width="30" height="20" fill="#e9eef9"/><circle cx="15" cy="10" r="7" fill="none" stroke="#5270a0" strokeWidth="1.3"/><ellipse cx="15" cy="10" rx="3.5" ry="7" fill="none" stroke="#5270a0"/><path d="M8 10h14" stroke="#5270a0"/></>}
  </svg>;
}
