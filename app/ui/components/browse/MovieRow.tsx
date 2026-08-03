import MovieCard from "./MovieCard";

type Movie = {
  id:number;
  title:string;
  genre:string;
  year:string;
  image:string;
};

export default function MovieRow({
  title,
  movies,
}:{
  title:string;
  movies:Movie[];
}){

  return(

    <section className="mx-auto max-w-7xl px-5 py-12 md:px-6">

      <h3 className="mb-7 text-2xl font-light tracking-tight text-white">
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4 md:gap-6">

        {movies.map(movie=>(
          <MovieCard
            key={movie.id}
            {...movie}
          />
        ))}

      </div>

    </section>

  );

}
