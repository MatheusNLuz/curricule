export function ModernAtsTemplate({ resume, isExport, language = "en-US" }: { resume: any, isExport: boolean, language?: string }) {
  const isPT = language.startsWith("pt-");
  const H = {
    PROFILE: isPT ? "Resumo Profissional" : "Profile",
    EXPERIENCE: isPT ? "Experiência Profissional" : "Experience",
    SKILLS: isPT ? "Habilidades Técnicas" : "Skills",
    EDUCATION: isPT ? "Formação Acadêmica" : "Education",
    CERTIFICATIONS: isPT ? "Certificações" : "Certifications"
  };

  const getContactItems = () => {
    const items = [];
    const loc = resume.personalInfo?.location || resume.contact?.location;
    if (loc) items.push({ label: loc });
    const phone = resume.personalInfo?.phone || resume.contact?.phone;
    if (phone) items.push({ label: phone });
    const email = resume.personalInfo?.email || resume.contact?.email;
    if (email) items.push({ label: email, url: `mailto:${email}` });
    const linkedin = resume.personalInfo?.linkedin || resume.contact?.linkedin;
    if (linkedin) items.push({ label: 'LinkedIn', url: linkedin.startsWith('http') ? linkedin : `https://${linkedin}` });
    const portfolio = resume.personalInfo?.portfolio || resume.contact?.portfolio;
    if (portfolio) items.push({ label: portfolio.toLowerCase().includes('github') ? 'GitHub' : 'Portfolio', url: portfolio.startsWith('http') ? portfolio : `https://${portfolio}` });
    return items;
  };

  const contactItems = getContactItems();

  return (
    <div className={`mx-auto bg-white text-[#334155] font-sans ${isExport ? 'w-full' : 'max-w-[21cm] p-10 shadow-lg border border-gray-100'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        ${isExport ? '@page { margin: 0.8cm 1.5cm; }' : '@page { margin: 0; }'}
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .jg-accent { color: #4F46E5 !important; }
        }
      `}} />
      
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[36px] font-bold text-[#0f172a] tracking-tight leading-none mb-3">
          {resume.personalInfo?.name || resume.contact?.fullName}
        </h1>
        
        <div className="text-[14px] text-[#64748b] flex flex-wrap items-center">
          {contactItems.map((item, index) => (
            <span key={index} className="flex items-center">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{item.label}</a>
              ) : (
                item.label
              )}
              {index < contactItems.length - 1 && <span className="mx-2 text-[#cbd5e1]">|</span>}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-t-[1px] border-[#c7d2fe] mb-6" />

      {/* Summary */}
      {(resume.professionalSummary || resume.summary) && (
        <section className="mb-6">
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#4F46E5] jg-accent mb-3">
            {H.PROFILE}
          </h3>
          <p className="text-[14px] leading-relaxed text-justify text-[#334155]">
            {resume.professionalSummary || resume.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {(resume.experiences || resume.experience) && (resume.experiences || resume.experience).length > 0 && (
        <section className="mb-6">
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#4F46E5] jg-accent mb-4">
            {H.EXPERIENCE}
          </h3>
          <div className="space-y-5">
            {(resume.experiences || resume.experience).map((exp: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="font-bold text-[15px] text-[#0f172a]">{exp.title}</h4>
                  <span className="text-[14px] text-[#64748b]">
                    {exp.startDate} – {exp.endDate || (isPT ? 'Presente' : 'Present')}
                  </span>
                </div>
                <div className="text-[14px] text-[#475569] mb-2">
                  {exp.company}{exp.location ? ` • ${exp.location}` : ""}
                </div>
                <ul className="list-disc pl-5 text-[14px] space-y-1.5 text-[#334155] marker:text-[#94a3b8]">
                  {(exp.description || exp.bullets || []).map((desc: string, j: number) => (
                    <li key={j} className="pl-1 leading-relaxed">{desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mb-6">
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#4F46E5] jg-accent mb-4">
            {H.SKILLS}
          </h3>
          <div className="text-[14px] space-y-2 text-[#334155]">
            {resume.skills.map((skillGroup: any, i: number) => (
              <div key={i} className="leading-relaxed">
                <span className="font-bold text-[#0f172a]">{skillGroup.category || skillGroup.group}:</span>{" "}
                {skillGroup.items.join(", ")}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mb-6">
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#4F46E5] jg-accent mb-4">
            {H.EDUCATION}
          </h3>
          <div className="space-y-4">
            {resume.education.map((edu: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline break-inside-avoid">
                <div>
                  <h4 className="font-bold text-[15px] text-[#0f172a]">{edu.institution}</h4>
                  <div className="text-[14px] text-[#475569] mt-0.5">{edu.degree}</div>
                </div>
                <span className="text-[14px] text-[#64748b] whitespace-nowrap ml-4">
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#4F46E5] jg-accent mb-4">
            {H.CERTIFICATIONS}
          </h3>
          <div className="space-y-3">
            {resume.certifications.map((cert: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline text-[14px] break-inside-avoid">
                <div className="text-[#0f172a]">
                  <span className="font-bold">{cert.name}</span>
                  {cert.issuer && <span className="text-[#475569] font-normal"> • {cert.issuer}</span>}
                </div>
                <span className="text-[#64748b] whitespace-nowrap ml-4">{cert.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
