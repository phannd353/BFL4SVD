import Image from "next/image";
import RoundedLinkButton from "./RoundedLinkButton";

export default function AboutSection() {
  return (
    <section
      className="relative flex w-full flex-col overflow-hidden"
      id="about"
    >
      <div className="flex h-full w-full place-content-center gap-6 max-xl:place-items-center max-lg:flex-col">
        <div className="flex flex-col place-content-center gap-4">
          <h1 className="flex flex-wrap text-3xl 2xl:text-6xl font-semibold uppercase leading-[85px] md:text-4xl max-md:leading-snug justify-center lg:justify-start gap-4">
            <span className="reveal-hero-text bg-main p-1 px-6">
              Nguyen Duy Phan
            </span>
            <br />
            <span className="reveal-hero-text"> Backend Developer</span>
          </h1>
          <div className="reveal-hero-text max-w-[750px] p-2 text-justify max-lg:max-w-full">
            I'm a Backend Developer with 1 year of experience, a curious
            technologist who is passionate about learning new things and writing
            clean, secure code. I can learn and adapt quickly. I wish to work in
            a challenging environment to improve and make the most of myself.
          </div>

          <RoundedLinkButton
            href="https://www.linkedin.com/in/phannd"
            label="Get in touch"
            target="_blank"
            rel="noopener noreferrer"
            className="self-center lg:self-start"
          />
        </div>

        <div className="flex w-full max-w-[50%] place-content-center place-items-center overflow-hidden max-lg:max-w-[unset]">
          <div className="relative flex max-h-[680px] min-h-[550px] min-w-[350px] max-w-[650px] overflow-hidden max-lg:h-fit max-lg:max-h-[320px] max-lg:min-h-[180px] max-lg:w-[320px] max-lg:min-w-[320px]">
            <Image
              src="/assets/image/home/phan.webp"
              alt="Phan's image"
              className="reveal-hero-img z-[1] h-auto w-full object-contain"
              width={650}
              height={550}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
