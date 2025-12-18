import Head from 'next/head';
import LandingPage from './landing';

export default function Home() {
  return (
    <>
      <Head>
        <title>Landing</title>
      </Head>
      <LandingPage />
    </>
  );
}

