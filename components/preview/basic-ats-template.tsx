export function BasicAtsTemplate({ resume, isExport, language = "en-US" }: { resume: any, isExport: boolean, language?: string }) {
  const isPT = language.startsWith("pt-");
  const H = {
    PROFILE: isPT ? "Resumo Profissional" : "Professional Summary",
    EXPERIENCE: isPT ? "Experiência Profissional" : "Professional Experience",
    SKILLS: isPT ? "Habilidades Técnicas" : "Technical Skills",
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
    <div className={`mx-auto bg-white text-black font-sans ${isExport ? 'w-full' : 'max-w-[21cm] p-8 shadow-sm border border-gray-200'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        ${isExport ? '@page { margin: 0.8cm 1.5cm; }' : '@page { margin: 0; }'}
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
      
      {/* Header */}
      <div className="text-center mb-3 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">{resume.personalInfo?.name || resume.contact?.fullName}</h1>
        <div className="text-[13px] flex flex-wrap justify-center text-gray-700 gap-y-1">
          {contactItems.map((item, index) => (
            <span key={index} className="whitespace-nowrap">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="text-gray-900 hover:text-indigo-600 transition-colors">{item.label}</a>
              ) : (
                item.label
              )}
              {index < contactItems.length - 1 && <span className="mx-1.5 font-bold text-gray-400">•</span>}
            </span>
          ))}
        </div>
      </div>

      {(resume.professionalSummary || resume.summary) && (
        <div className="mb-4">
          <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-2">{H.PROFILE}</h2>
          <p className="text-[13px] leading-relaxed text-justify">{resume.professionalSummary || resume.summary}</p>
        </div>
      )}

      {/* Experience */}
      {(resume.experiences || resume.experience) && (resume.experiences || resume.experience).length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-2">{H.EXPERIENCE}</h2>
          <div className="space-y-2.5">
            {(resume.experiences || resume.experience).map((exp: any, i: number) => (
              <div key={i} className="break-inside-avoid mb-2">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-[14px] text-gray-950">{exp.title}</h3>
                  <span className="text-[12px] font-medium text-gray-600">{exp.startDate} – {exp.endDate || (isPT ? 'Presente' : 'Present')}</span>
                </div>
                <div className="text-[13px] italic text-gray-750 mb-1.5">{exp.company} {exp.location ? `- ${exp.location}` : ""}</div>
                <ul className="list-disc pl-5 text-[13px] space-y-0.5 text-gray-800">
                  {(exp.description || exp.bullets || []).map((desc: string, j: number) => (
                    <li key={j}>{desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-2">{H.SKILLS}</h2>
          <div className="text-[13px] space-y-1 text-gray-850">
            {resume.skills.map((skillGroup: any, i: number) => (
              <div key={i} className="break-inside-avoid">
                <span className="font-bold">{skillGroup.category || skillGroup.group}:</span> {skillGroup.items.join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-2">{H.EDUCATION}</h2>
          <div className="space-y-2">
            {resume.education.map((edu: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline break-inside-avoid">
                <div>
                  <div className="font-bold text-[14px] text-gray-950">{edu.institution}</div>
                  <div className="text-[13px] italic text-gray-700">{edu.degree}</div>
                </div>
                <div className="text-[12px] text-gray-650">{edu.startDate} – {edu.endDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-2">{H.CERTIFICATIONS}</h2>
          <div className="text-[13px] space-y-1 text-gray-800">
            {resume.certifications.map((cert: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline">
                <span><span className="font-bold">{cert.name}</span>, {cert.issuer}</span>
                <span className="text-[12px] text-gray-650">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
